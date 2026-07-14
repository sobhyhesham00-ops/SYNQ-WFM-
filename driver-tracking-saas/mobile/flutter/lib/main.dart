// Minimal driver app shell. Real app adds login, order list, nav to Maps.
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'services/location_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initBackgroundTracking();
  runApp(const TayarApp());
}

class TayarApp extends StatelessWidget {
  const TayarApp({super.key});
  @override
  Widget build(BuildContext context) =>
      const MaterialApp(home: ShiftScreen());
}

class ShiftScreen extends StatefulWidget {
  const ShiftScreen({super.key});
  @override
  State<ShiftScreen> createState() => _ShiftScreenState();
}

class _ShiftScreenState extends State<ShiftScreen> {
  bool _onShift = false;

  Future<void> _ensurePermissions() async {
    // "Allow all the time" is required for background tracking.
    await Permission.locationWhenInUse.request();
    await Permission.locationAlways.request();
    await Permission.notification.request();
    // Send the driver to disable battery optimization (OEM-specific screens).
    await Permission.ignoreBatteryOptimizations.request();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tayar')),
      body: Center(
        child: ElevatedButton(
          onPressed: () async {
            if (!_onShift) {
              await _ensurePermissions();
              await startShift();
            } else {
              endShift();
            }
            setState(() => _onShift = !_onShift);
          },
          child: Text(_onShift ? 'إنهاء الوردية' : 'بدء الوردية'),
        ),
      ),
    );
  }
}
