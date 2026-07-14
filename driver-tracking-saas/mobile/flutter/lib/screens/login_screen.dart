// Driver login — phone + PIN, themed to match the dashboard.
import 'package:flutter/material.dart';
import '../theme.dart';
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
          child: TayarCard(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(children: [
                  Container(width: 30, height: 30,
                    decoration: BoxDecoration(gradient: TayarColors.brandGradient,
                      borderRadius: BorderRadius.circular(9))),
                  const SizedBox(width: 10),
                  const Text('Tayar', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 22)),
                ]),
                const SizedBox(height: 6),
                Text('Driver sign in', style: TextStyle(color: TayarColors.muted)),
                const SizedBox(height: 18),
                TextField(controller: _phone, keyboardType: TextInputType.phone,
                  decoration: _dec('Phone number')),
                const SizedBox(height: 12),
                TextField(controller: _pin, obscureText: true, keyboardType: TextInputType.number,
                  decoration: _dec('PIN')),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Sign in'),
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
