// Meshwar driver app entrypoint.
import 'package:flutter/material.dart';
import 'theme.dart';
import 'services/location_service.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initBackgroundTracking();
  runApp(const MeshwarApp());
}

class MeshwarApp extends StatelessWidget {
  const MeshwarApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Meshwar Driver',
        debugShowCheckedModeBanner: false,
        theme: buildMeshwarTheme(),
        home: const LoginScreen(),
      );
}
