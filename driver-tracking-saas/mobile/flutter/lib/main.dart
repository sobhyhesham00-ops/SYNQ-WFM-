// Tayar driver app entrypoint.
import 'package:flutter/material.dart';
import 'theme.dart';
import 'services/location_service.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initBackgroundTracking();
  runApp(const TayarApp());
}

class TayarApp extends StatelessWidget {
  const TayarApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Tayar Driver',
        debugShowCheckedModeBanner: false,
        theme: buildTayarTheme(),
        home: const LoginScreen(),
      );
}
