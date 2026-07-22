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
import 'dart:ui'; // DartPluginRegistrant (needed to use plugins in the bg isolate)
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:geolocator/geolocator.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter/widgets.dart';
import 'auth_store.dart';

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
      initialNotificationTitle: 'El Kaptin — أنت متصل',
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
  final token = await _readToken(); // JWT saved at login (also inits the plugins)

  // This runs in a SEPARATE background isolate, which has its own Hive state —
  // the box opened in initBackgroundTracking (main isolate) isn't visible here.
  // Open it locally (guarded so it works whether or not this shares an isolate).
  await Hive.initFlutter();
  final box = Hive.isBoxOpen('loc_queue') ? Hive.box('loc_queue') : await Hive.openBox('loc_queue');

  final List<Map<String, dynamic>> buffer = [];
  WebSocketChannel? channel;
  bool connected = false; // only true while the socket is actually open
  bool flushing = false;  // guards against a slow flush overlapping the next tick

  void connect() {
    final ch = WebSocketChannel.connect(Uri.parse('$_wsBase/ws/driver?token=$token'));
    channel = ch;
    connected = false;
    // `ready` completes when the handshake succeeds; errors if it can't connect.
    ch.ready.then((_) => connected = true).catchError((_) => connected = false);
    // A dropped/closed socket flips us back to offline so the next flush
    // persists fixes to Hive instead of firing them into a dead sink.
    ch.stream.listen(
      (_) {},
      onError: (_) => connected = false,
      onDone: () => connected = false,
      cancelOnError: true,
    );
  }
  connect();

  // Keep the Android notification honest about state.
  if (service is AndroidServiceInstance) {
    service.setForegroundNotificationInfo(
      title: 'El Kaptin — أنت متصل',
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

  // 2) Flush one batched frame every _flushSeconds. Fixes are NEVER dropped:
  //    on any failure (offline, dropped socket, send error) the batch is
  //    persisted to Hive and we reconnect for the next tick.
  final flushTimer = Timer.periodic(const Duration(seconds: _flushSeconds), (_) async {
    if (flushing) return;
    flushing = true;
    try {
      final queued = box.values.cast<String>().toList();

      // Snapshot + clear the live buffer up front so fixes arriving during the
      // awaits below are neither lost nor sent twice.
      final pending = List<Map<String, dynamic>>.from(buffer);
      buffer.clear();

      if (pending.isEmpty && queued.isEmpty) return;

      // Socket not open? Persist this batch and try to reconnect next tick —
      // sink.add on a dead socket fails silently, so we must not clear on it.
      if (!connected || channel == null) {
        for (final s in pending) {
          await box.add(jsonEncode(s));
        }
        connect();
        return;
      }

      final samples = [
        ...queued.map((s) => jsonDecode(s) as Map<String, dynamic>),
        ...pending,
      ];
      try {
        channel!.sink.add(jsonEncode({'type': 'locations', 'samples': samples}));
        await box.clear(); // handed to the socket — drop the offline queue
      } catch (_) {
        connected = false;
        for (final s in pending) {
          await box.add(jsonEncode(s));
        }
        connect();
      }
    } finally {
      flushing = false;
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
  // The background isolate needs plugins registered before reading storage.
  DartPluginRegistrant.ensureInitialized();
  final token = await AuthStore.token();
  return token ?? const String.fromEnvironment('DRIVER_TOKEN', defaultValue: '');
}
