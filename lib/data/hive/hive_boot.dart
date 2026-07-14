import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../models/debt.dart';
import '../models/expense.dart';
import '../models/fawry_transaction.dart';
import '../models/sale.dart';

/// Box names used throughout the app.
class Boxes {
  Boxes._();
  static const sales = 'sales_box';
  static const expenses = 'expenses_box';
  static const debts = 'debts_box';
  static const fawry = 'fawry_box';
  static const settings = 'settings_box';
}

/// Initializes Hive with AES encryption for the sensitive financial boxes.
///
/// Offline-first: every write lands on disk instantly and synchronously in the
/// local box; there is no network dependency to record a sale.
class HiveBoot {
  HiveBoot._();

  static const _secure = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const _keyName = 'dargak_hive_key_v1';

  static Future<void> init() async {
    await Hive.initFlutter();

    Hive
      ..registerAdapter(SaleAdapter())
      ..registerAdapter(ExpenseAdapter())
      ..registerAdapter(DebtAdapter())
      ..registerAdapter(FawryTransactionAdapter());

    final cipher = HiveAesCipher(await _encryptionKey());

    await Future.wait([
      Hive.openBox<Sale>(Boxes.sales, encryptionCipher: cipher),
      Hive.openBox<Expense>(Boxes.expenses, encryptionCipher: cipher),
      Hive.openBox<Debt>(Boxes.debts, encryptionCipher: cipher),
      Hive.openBox<FawryTransaction>(Boxes.fawry, encryptionCipher: cipher),
      Hive.openBox(Boxes.settings), // non-sensitive prefs
    ]);
  }

  /// Reads (or lazily creates) the 256-bit AES key from the platform keystore.
  static Future<List<int>> _encryptionKey() async {
    final existing = await _secure.read(key: _keyName);
    if (existing != null) {
      return base64Url.decode(existing);
    }
    final key = Hive.generateSecureKey();
    await _secure.write(key: _keyName, value: base64Url.encode(key));
    return key;
  }
}
