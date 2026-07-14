// Shared visual language — mirrors the web dashboard (lilac gradient fintech).
import 'package:flutter/material.dart';

class TayarColors {
  static const brand = Color(0xFF7C5CFF);
  static const brand2 = Color(0xFFB79BFF);
  static const ink = Color(0xFF1A1730);
  static const muted = Color(0xFF8B86A3);
  static const bg = Color(0xFFF4F2FB);
  static const danger = Color(0xFFE63946);
  static const ok = Color(0xFF17A673);

  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF7C5CFF), Color(0xFF9D7BFF), Color(0xFFB79BFF)],
  );
}

ThemeData buildTayarTheme() {
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: TayarColors.bg,
    colorScheme: ColorScheme.fromSeed(seedColor: TayarColors.brand),
    fontFamily: 'Inter',
    textTheme: const TextTheme(
      titleLarge: TextStyle(fontWeight: FontWeight.w800, color: TayarColors.ink),
      bodyMedium: TextStyle(color: TayarColors.ink),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: TayarColors.brand,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        padding: const EdgeInsets.symmetric(vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
  );
}

// A rounded card matching the dashboard's white elevated cards.
class TayarCard extends StatelessWidget {
  const TayarCard({super.key, required this.child, this.padding});
  final Widget child;
  final EdgeInsets? padding;
  @override
  Widget build(BuildContext context) => Container(
        padding: padding ?? const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF5A46B4).withOpacity(0.08),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: child,
      );
}
