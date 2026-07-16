// Meshwar driver app entrypoint.
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'theme.dart';
import 'i18n.dart';
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
  Widget build(BuildContext context) {
    // Rebuild the whole app when the language flips (RTL follows the locale).
    return ValueListenableBuilder<String>(
      valueListenable: langNotifier,
      builder: (_, lang, __) => MaterialApp(
        title: 'El Kaptin Driver',
        debugShowCheckedModeBanner: false,
        theme: buildMeshwarTheme(),
        locale: Locale(lang),
        supportedLocales: const [Locale('ar'), Locale('en')],
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        home: const LoginScreen(),
      ),
    );
  }
}
