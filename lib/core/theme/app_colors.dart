import 'package:flutter/material.dart';

/// Central color palette for Dargak.
///
/// Inspired by the clean, soft fintech aesthetic: lavender/violet gradients,
/// bright white cards, gentle shadows and semantic accents that let a busy
/// merchant read numbers at a glance.
class AppColors {
  AppColors._();

  // Brand
  static const Color primary = Color(0xFF6C4DFF);
  static const Color primaryDark = Color(0xFF4A2FD6);
  static const Color primaryLight = Color(0xFF9C83FF);

  static const List<Color> brandGradient = [
    Color(0xFF7B61FF),
    Color(0xFF9C83FF),
  ];

  static const List<Color> profitGradient = [
    Color(0xFF16C784),
    Color(0xFF37E29B),
  ];

  // Semantic (financial meaning)
  static const Color revenue = Color(0xFF6C4DFF); // product turnover
  static const Color service = Color(0xFFFF9F43); // Fawry / wallet commission
  static const Color profit = Color(0xFF16C784); // net / positive
  static const Color cost = Color(0xFFFF5C7C); // expenses / debts owed
  static const Color owedToMe = Color(0xFF16C784); // عليه — they owe me
  static const Color iOwe = Color(0xFFFF5C7C); // له — I owe them

  // Light theme surfaces
  static const Color bgLight = Color(0xFFF5F4FB);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color textPrimaryLight = Color(0xFF1A1B2E);
  static const Color textSecondaryLight = Color(0xFF7C7E96);
  static const Color dividerLight = Color(0xFFEDEBF6);

  // Dark theme surfaces
  static const Color bgDark = Color(0xFF14131C);
  static const Color cardDark = Color(0xFF1F1E2B);
  static const Color textPrimaryDark = Color(0xFFF4F3FB);
  static const Color textSecondaryDark = Color(0xFF9E9FB4);
  static const Color dividerDark = Color(0xFF2C2B3A);

  // Neutral chips
  static const Color chipBg = Color(0xFFF0EEFA);
}
