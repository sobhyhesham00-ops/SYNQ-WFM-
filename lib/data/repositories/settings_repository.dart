import 'package:hive/hive.dart';

import '../models/merchant_settings.dart';

class SettingsRepository {
  SettingsRepository(this._box);
  final Box _box;
  static const _key = 'merchant_settings';

  MerchantSettings load() {
    final raw = _box.get(_key);
    if (raw is Map) return MerchantSettings.fromMap(raw);
    return const MerchantSettings();
  }

  Future<void> save(MerchantSettings settings) =>
      _box.put(_key, settings.toMap());
}
