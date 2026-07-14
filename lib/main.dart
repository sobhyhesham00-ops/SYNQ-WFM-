import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';
import 'data/hive/hive_boot.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait — a POS-style single-hand experience.
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  // Offline-first storage — ready before the first frame.
  await HiveBoot.init();

  // Date/number symbols for both locales.
  await initializeDateFormatting('ar');
  await initializeDateFormatting('en');

  runApp(const ProviderScope(child: DargakApp()));
}
