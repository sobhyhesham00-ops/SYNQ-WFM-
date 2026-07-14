import 'package:flutter/services.dart';

/// Thin wrapper over platform haptics.
///
/// Busy merchants (wet hands, quick taps) benefit from a tactile confirmation
/// that a save actually landed, without having to read the screen.
class Haptics {
  Haptics._();

  static void success() {
    HapticFeedback.mediumImpact();
  }

  static void light() {
    HapticFeedback.selectionClick();
  }

  static void warning() {
    HapticFeedback.heavyImpact();
  }
}
