import 'package:intl/intl.dart';

/// Formatting helpers that respect the active language.
class Formatters {
  Formatters._();

  /// Money with thousands separators, e.g. `1,250` / `١٬٢٥٠`.
  static String money(num value, {required bool isArabic, int decimals = 0}) {
    final locale = isArabic ? 'ar_EG' : 'en';
    final f = NumberFormat.currency(
      locale: locale,
      symbol: '',
      decimalDigits: decimals,
    );
    return f.format(value).trim();
  }

  /// Money with the EGP unit appended in the right language.
  static String moneyWithUnit(num value,
      {required bool isArabic, int decimals = 0}) {
    final amount = money(value, isArabic: isArabic, decimals: decimals);
    return isArabic ? '$amount ج.م' : '$amount EGP';
  }

  static String date(DateTime d, {required bool isArabic}) {
    return DateFormat('d MMM', isArabic ? 'ar' : 'en').format(d);
  }

  static String dateTime(DateTime d, {required bool isArabic}) {
    return DateFormat('d MMM · h:mm a', isArabic ? 'ar' : 'en').format(d);
  }

  static String monthYear(DateTime d, {required bool isArabic}) {
    return DateFormat('MMMM yyyy', isArabic ? 'ar' : 'en').format(d);
  }
}
