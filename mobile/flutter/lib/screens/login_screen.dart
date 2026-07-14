// Driver login — phone + PIN, themed to match the dashboard.
import 'package:flutter/material.dart';
import '../theme.dart';
import '../i18n.dart';
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

  Future<void> _submit() async {
    setState(() => _loading = true);
    // TODO: POST /api/auth/driver/login -> save JWT via flutter_secure_storage.
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const HomeScreen(driverName: 'Mahmoud')),
    );
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
                  const Text('Meshwar', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
                  const SizedBox(width: 8),
                  const Text('مشوار', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: MeshwarColors.muted)),
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
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(tr('signIn')),
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
