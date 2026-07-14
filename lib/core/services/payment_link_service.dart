import '../../data/models/merchant_settings.dart';

/// Builds InstaPay / e-wallet payment deep links and QR payloads.
///
/// InstaPay (Egypt / IPN) exposes shareable request links under the
/// `https://ipn.eg/S/...` domain that, when opened on a phone, hand off to the
/// customer's installed InstaPay / bank / wallet app with the beneficiary and
/// amount pre-filled. We encode the merchant's Instant Payment Address (IPA,
/// e.g. `name@instapay`) or mobile-wallet number together with the requested
/// amount into that structure so a single scan starts the transfer.
class PaymentLinkService {
  PaymentLinkService._();

  static const _base = 'https://ipn.eg/S';

  /// Result carries everything the Get-Paid screen needs.
  static PaymentRequest build({
    required MerchantSettings settings,
    required double amount,
    String? note,
  }) {
    final bool useIpa = settings.instapayAddress.trim().isNotEmpty;
    final String target =
        useIpa ? settings.instapayAddress.trim() : settings.walletNumber.trim();
    final String kind = useIpa ? 'ipa' : 'wallet';
    final String amountStr = amount.toStringAsFixed(2);

    // Deep link — opens InstaPay / wallet app, pre-filled beneficiary+amount.
    final params = <String, String>{
      'type': kind,
      'addr': target,
      'amount': amountStr,
      'cur': 'EGP',
      if (settings.shopName.trim().isNotEmpty)
        'name': settings.shopName.trim(),
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    };
    final query = params.entries
        .map((e) =>
            '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');
    final deepLink = '$_base/$kind/${Uri.encodeComponent(target)}?$query';

    // The QR encodes the same deep link so a phone camera resolves it.
    return PaymentRequest(
      deepLink: deepLink,
      qrPayload: deepLink,
      target: target,
      isIpa: useIpa,
      amount: amount,
    );
  }
}

class PaymentRequest {
  const PaymentRequest({
    required this.deepLink,
    required this.qrPayload,
    required this.target,
    required this.isIpa,
    required this.amount,
  });

  final String deepLink;
  final String qrPayload;
  final String target;
  final bool isIpa;
  final double amount;
}
