// Securely persists the driver's JWT + profile after login.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthStore {
  static const _storage = FlutterSecureStorage();
  static const _kToken = 'meshwar_driver_token';
  static const _kName = 'meshwar_driver_name';

  static Future<void> save(String token, String name) async {
    await _storage.write(key: _kToken, value: token);
    await _storage.write(key: _kName, value: name);
  }

  static Future<String?> token() => _storage.read(key: _kToken);
  static Future<String?> name() => _storage.read(key: _kName);
  static Future<void> clear() async {
    await _storage.delete(key: _kToken);
    await _storage.delete(key: _kName);
  }
}
