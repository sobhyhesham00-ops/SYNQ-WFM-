// Backend URL resolution for the driver app.
//
// The URL can come from two places, in priority order:
//   1. A runtime override the driver saves on the login screen (persisted to
//      Hive), so ONE build works against any backend — a Codespace URL that
//      changes per session, a staging box, or production.
//   2. The compile-time default baked in via --dart-define (what the CI APK
//      build sets), falling back to production.
//
// Both the UI isolate and the background GPS isolate read the same Hive box, so
// they always agree on where to talk.
import 'package:hive_flutter/hive_flutter.dart';

const _defaultApiBase = String.fromEnvironment('API_BASE', defaultValue: 'https://api.meshwar.app');
const _defaultWsBase = String.fromEnvironment('WS_BASE', defaultValue: 'wss://api.meshwar.app');
const configBoxName = 'config';
const _key = 'apiBase';

class ServerConfig {
  static Box? _box;

  /// Open the config box once at startup (main/UI isolate).
  static Future<void> init() async {
    _box = Hive.isBoxOpen(configBoxName) ? Hive.box(configBoxName) : await Hive.openBox(configBoxName);
  }

  static String? get _override {
    final v = _box?.get(_key) as String?;
    return (v != null && v.isNotEmpty) ? v : null;
  }

  /// Effective REST base — the saved override, else the build-time default.
  static String get apiBase => _override ?? _defaultApiBase;

  /// Effective WS base, derived from the same source (https→wss, http→ws).
  static String get wsBase {
    final o = _override;
    return o != null ? wsFrom(o) : _defaultWsBase;
  }

  /// Whether a custom URL is in effect (for showing state on the login screen).
  static bool get isCustom => _override != null;

  /// The default, shown as a placeholder / reset target.
  static String get defaultApiBase => _defaultApiBase;

  /// Save a backend URL override; an empty string clears it (back to default).
  static Future<void> save(String url) async {
    final u = url.trim();
    if (u.isEmpty) {
      await _box?.delete(_key);
    } else {
      await _box?.put(_key, normalize(u));
    }
  }

  /// Normalize user input: default to https, drop a trailing slash.
  static String normalize(String url) {
    var s = url.trim();
    if (s.isEmpty) return s;
    if (!s.startsWith('http://') && !s.startsWith('https://')) s = 'https://$s';
    if (s.endsWith('/')) s = s.substring(0, s.length - 1);
    return s;
  }

  static String wsFrom(String httpUrl) =>
      httpUrl.replaceFirst('https://', 'wss://').replaceFirst('http://', 'ws://');

  /// WS base read directly from a given box — for the background isolate, which
  /// has its own Hive state and can't use the static [_box].
  static String wsBaseFromBox(Box box) {
    final v = box.get(_key) as String?;
    return (v != null && v.isNotEmpty) ? wsFrom(v) : _defaultWsBase;
  }
}
