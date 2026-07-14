// Background location tracking service.  (Blueprint §3)
//
// THE PROBLEM (Egypt): budget Xiaomi/Realme/Samsung phones aggressively kill
// background isolates. A plain Timer or a normal isolate WILL be frozen the
// moment the screen locks or the driver switches to Google Maps.
//
// THE FIX: run tracking inside an Android *foreground service* with a visible,
// persistent notification (via flutter_background_service). The OS treats a
// foreground service as user-visible work and does not freeze it. On iOS we use
// the "location" background mode + allowsBackgroundLocationUpdates.
//
// DATA DISCIPLINE (§ minimal data): we do NOT stream every GPS fix. We collect
// fixes into a buffer and flush ONE batched WebSocket frame every FLUSH_SECONDS.
// If the socket is down, fixes persist to Hive and flush on reconnect.

import 'dart:async';
import 'dart:convert';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:geolocator/geolocator.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:hive_flutter/hive_flutter.dart';

const _flushSeconds = 20; // send one frame every 20s
const _minMovementMeters = 40; // ignore jitter smaller than this
const _wsBase = String.fromEnvironment('WS_BASE', defaultValue: 'wss://api.meshwar.app');

/// Called once at app startup to register the background service.
Future<void> initBackgroundTracking() async {
  await Hive.initFlutter();
  await Hive.openBox('loc_queue');

  final service = FlutterBackgroundService();
  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onServiceStart,
      isForegroundMode: true, // <-- the key to surviving battery optimizers
      autoStart: false, // start only when the driver goes on shift
      notificationChannelId: 'meshwar_tracking',
      initialNotificationTitle: 'Meshwar — أنت متصل',
      initialNotificationContent: 'جارٍ تتبع موقعك أثناء الوردية',
      foregroundServiceNotificationId: 8801,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: onServiceStart,
      onBackground: onIosBackground,
    ),
  );
}

/// Driver taps "Start shift".
Future<void> startShift() async => FlutterBackgroundService().startService();

/// Driver taps "End shift".
void endShift() => FlutterBackgroundService().invoke('stop');

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async => true;

@pragma('vm:entry-point')
void onServiceStart(ServiceInstance service) async {
  final token = await _readToken(); // JWT saved at login
  final List<Map<String, dynamic>> buffer = [];
  WebSocketChannel? channel;

  void connect() {
    channel = WebSocketChannel.connect(Uri.parse('$_wsBase/ws/driver?token=$token'));
  }
  connect();

  // Keep the Android notification honest about state.
  if (service is AndroidServiceInstance) {
    service.setForegroundNotificationInfo(
      title: 'Meshwar — أنت متصل',
      content: 'التتبع يعمل في الخلفية',
    );
  }

  // 1) Stream GPS. distanceFilter avoids spamming fixes while stopped at a light.
  final posStream = Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: _minMovementMeters,
    ),
  );
  final posSub = posStream.listen((Position p) {
    buffer.add({
      'lat': p.latitude,
      'lng': p.longitude,
      'ts': DateTime.now().millisecondsSinceEpoch,
    });
  });

  // 2) Flush one batched frame every _flushSeconds.
  final flushTimer = Timer.periodic(const Duration(seconds: _flushSeconds), (_) async {
    // Drain any previously-queued fixes (from an offline period) first.
    final box = Hive.box('loc_queue');
    final queued = box.values.cast<String>().toList();

    if (buffer.isEmpty && queued.isEmpty) return;

    final samples = [
      ...queued.map((s) => jsonDecode(s) as Map<String, dynamic>),
      ...buffer,
    ];
    final frame = jsonEncode({'type': 'locations', 'samples': samples});

    try {
      channel!.sink.add(frame);
      buffer.clear();
      await box.clear(); // sent successfully, drop the queue
    } catch (_) {
      // Offline: persist this batch and reconnect for next tick.
      for (final s in buffer) {
        await box.add(jsonEncode(s));
      }
      buffer.clear();
      connect();
    }
  });

  // 3) Clean shutdown when the driver ends the shift.
  service.on('stop').listen((_) async {
    flushTimer.cancel();
    await posSub.cancel();
    await channel?.sink.close();
    await service.stopSelf();
  });
}

Future<String> _readToken() async {
  // Read the JWT you stored at login (flutter_secure_storage in real app).
  return const String.fromEnvironment('DRIVER_TOKEN', defaultValue: '');
}
