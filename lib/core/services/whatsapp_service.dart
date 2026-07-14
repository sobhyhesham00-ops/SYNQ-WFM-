import 'package:url_launcher/url_launcher.dart';

/// Launches WhatsApp with pre-written messages: the "automated chasing engine"
/// for debts plus generic payment-link sharing.
class WhatsAppService {
  WhatsAppService._();

  /// Normalizes an Egyptian mobile to the international `20` format.
  static String normalizeEgPhone(String raw) {
    var p = raw.replaceAll(RegExp(r'[^0-9+]'), '');
    if (p.startsWith('+')) p = p.substring(1);
    if (p.startsWith('00')) p = p.substring(2);
    if (p.startsWith('0')) p = '20${p.substring(1)}';
    if (!p.startsWith('20') && p.length == 10) p = '20$p';
    return p;
  }

  /// Opens a WhatsApp chat (with [phone] if given) pre-filled with [message].
  /// Returns false if nothing could be launched.
  static Future<bool> send({String? phone, required String message}) async {
    final text = Uri.encodeComponent(message);
    final candidates = <Uri>[
      if (phone != null && phone.trim().isNotEmpty)
        Uri.parse('https://wa.me/${normalizeEgPhone(phone)}?text=$text')
      else
        Uri.parse('https://wa.me/?text=$text'),
      if (phone != null && phone.trim().isNotEmpty)
        Uri.parse('whatsapp://send?phone=${normalizeEgPhone(phone)}&text=$text')
      else
        Uri.parse('whatsapp://send?text=$text'),
    ];
    for (final uri in candidates) {
      if (await canLaunchUrl(uri)) {
        return launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
    return false;
  }

  // ── Debt reminder templates (polite, dynamic) ──────────────────────────────
  static String debtReminderAr({
    required String name,
    required double amount,
    String? paymentLink,
  }) {
    final amountStr = amount.toStringAsFixed(0);
    final link = (paymentLink != null && paymentLink.isNotEmpty)
        ? '\n\nتقدر تحوّل من هنا على طول:\n$paymentLink'
        : '';
    return 'أهلاً $name 🌸\n'
        'حابب أفكّرك بلطف إن باقي معاك مبلغ $amountStr جنيه.\n'
        'مفيش أي استعجال، وقت ما يتيسّر. متشكر لتعاملك معانا ❤️'
        '$link';
  }

  static String debtReminderEn({
    required String name,
    required double amount,
    String? paymentLink,
  }) {
    final amountStr = amount.toStringAsFixed(0);
    final link = (paymentLink != null && paymentLink.isNotEmpty)
        ? '\n\nYou can transfer here anytime:\n$paymentLink'
        : '';
    return 'Hi $name 🌸\n'
        'Just a gentle reminder that there is an outstanding balance of '
        'EGP $amountStr.\n'
        'No rush at all, whenever it suits you. Thank you for your business ❤️'
        '$link';
  }

  // ── Payment-link sharing (transfer text) ───────────────────────────────────
  static String paymentShareAr({
    required String shopName,
    required double amount,
    required String target,
    required String link,
  }) {
    return 'دفعة لـ $shopName\n'
        'المبلغ: ${amount.toStringAsFixed(0)} جنيه\n'
        'التحويل على: $target\n'
        'أو امسح/افتح الرابط: $link';
  }

  static String paymentShareEn({
    required String shopName,
    required double amount,
    required String target,
    required String link,
  }) {
    return 'Payment to $shopName\n'
        'Amount: EGP ${amount.toStringAsFixed(0)}\n'
        'Send to: $target\n'
        'Or scan/open: $link';
  }
}
