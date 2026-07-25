// Driver login — phone + PIN, themed to match the dashboard.
import 'package:flutter/material.dart';
import '../theme.dart';
import '../i18n.dart';
import '../services/api_client.dart';
import '../services/auth_store.dart';
import '../services/server_config.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController(text: '01000000001');
  final _pin = TextEditingController(text: '1234');
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await DriverApi.login(_phone.text.trim(), _pin.text.trim());
      final token = res['token'] as String;
      final name = (res['name'] as String?) ?? 'Driver';
      await AuthStore.save(token, name);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => HomeScreen(token: token, driverName: name)),
      );
    } catch (_) {
      if (mounted) setState(() => _error = tr('invalidCreds'));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Let the driver point the app at a backend URL (e.g. a Codespace link), so
  // one installed APK works anywhere without a rebuild.
  Future<void> _editServer() async {
    final ctrl = TextEditingController(text: ServerConfig.isCustom ? ServerConfig.apiBase : '');
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(tr('serverSettings')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(tr('serverHint'), style: const TextStyle(color: MeshwarColors.muted, fontSize: 13)),
          const SizedBox(height: 12),
          TextField(
            controller: ctrl,
            keyboardType: TextInputType.url,
            autocorrect: false,
            decoration: InputDecoration(
              hintText: ServerConfig.defaultApiBase,
              labelText: tr('serverUrl'),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ]),
        actions: [
          TextButton(
            onPressed: () async { await ServerConfig.save(''); if (ctx.mounted) Navigator.of(ctx).pop(true); },
            child: Text(tr('useDefault')),
          ),
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: Text(tr('cancel'))),
          FilledButton(
            onPressed: () async { await ServerConfig.save(ctrl.text); if (ctx.mounted) Navigator.of(ctx).pop(true); },
            child: Text(tr('save')),
          ),
        ],
      ),
    );
    if (saved == true && mounted) {
      setState(() {}); // refresh the little status line
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('serverSaved'))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: MeshwarCard(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(children: [
                  Container(width: 30, height: 30,
                    decoration: BoxDecoration(gradient: MeshwarColors.brandGradient,
                      borderRadius: BorderRadius.circular(9))),
                  const SizedBox(width: 10),
                  const Text('El Kaptin', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
                  const SizedBox(width: 8),
                  const Text('الكابتن', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: MeshwarColors.muted)),
                  const Spacer(),
                  TextButton(
                    onPressed: () => toggleLang(),
                    child: Text(langNotifier.value == 'ar' ? 'English' : 'العربية',
                      style: const TextStyle(color: MeshwarColors.brand, fontWeight: FontWeight.w700)),
                  ),
                ]),
                const SizedBox(height: 6),
                Text(tr('driverSignIn'), style: const TextStyle(color: MeshwarColors.muted)),
                const SizedBox(height: 18),
                TextField(controller: _phone, keyboardType: TextInputType.phone,
                  decoration: _dec(tr('phone'))),
                const SizedBox(height: 12),
                TextField(controller: _pin, obscureText: true, keyboardType: TextInputType.number,
                  decoration: _dec(tr('pin'))),
                if (_error != null) Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text(_error!, style: const TextStyle(color: MeshwarColors.danger, fontSize: 13)),
                ),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(tr('signIn')),
                ),
                const SizedBox(height: 6),
                TextButton.icon(
                  onPressed: _editServer,
                  icon: const Icon(Icons.dns_outlined, size: 16, color: MeshwarColors.muted),
                  label: Text(
                    ServerConfig.isCustom ? ServerConfig.apiBase : tr('usingDefault'),
                    maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: MeshwarColors.muted, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _dec(String label) => InputDecoration(
        labelText: label,
        filled: true,
        fillColor: const Color(0xFFFBFAFF),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      );
}
