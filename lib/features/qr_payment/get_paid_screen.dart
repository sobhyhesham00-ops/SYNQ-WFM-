import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/services/payment_link_service.dart';
import '../../core/services/whatsapp_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/haptics.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/big_button.dart';
import '../../shared/widgets/feedback.dart';
import '../../shared/widgets/labeled_field.dart';
import '../settings/settings_screen.dart';

/// The "Generate Payment QR" utility — the InstaPay / e-wallet payment engine.
class GetPaidScreen extends ConsumerStatefulWidget {
  const GetPaidScreen({super.key});

  @override
  ConsumerState<GetPaidScreen> createState() => _GetPaidScreenState();
}

class _GetPaidScreenState extends ConsumerState<GetPaidScreen> {
  final _amount = TextEditingController();
  double _amountValue = 0;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final settings = ref.watch(settingsProvider);
    final theme = Theme.of(context);

    if (!settings.hasPaymentInfo) {
      return _needsSetup(context);
    }

    final request = _amountValue > 0
        ? PaymentLinkService.build(settings: settings, amount: _amountValue)
        : null;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 120),
        children: [
          Text(l.t('get_paid_title'),
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(l.t('get_paid_sub'),
              style: theme.textTheme.bodyMedium
                  ?.copyWith(color: AppColors.textSecondaryLight)),
          const SizedBox(height: 20),
          AmountField(
            label: l.t('amount_to_receive'),
            controller: _amount,
            onChanged: (v) =>
                setState(() => _amountValue = double.tryParse(v) ?? 0),
          ),
          const SizedBox(height: 12),
          _receiveTo(context, settings.instapayAddress.isNotEmpty
              ? settings.instapayAddress
              : settings.walletNumber),
          const SizedBox(height: 20),
          _qrCard(context, request),
          const SizedBox(height: 20),
          if (request != null) ...[
            BigButton(
              label: l.t('share_whatsapp'),
              icon: Icons.chat_rounded,
              gradient: const [Color(0xFF25D366), Color(0xFF12B855)],
              onPressed: () => _shareWhatsApp(request),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copy(request.deepLink, l.t('copied')),
                    icon: const Icon(Icons.link_rounded),
                    label: Text(l.t('copy_link')),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copy(_transferText(request), l.t('copied')),
                    icon: const Icon(Icons.copy_rounded),
                    label: Text(l.t('copy_text')),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Center(
              child: TextButton.icon(
                onPressed: () => Share.share(_transferText(request)),
                icon: const Icon(Icons.ios_share_rounded),
                label: Text(l.t('share_whatsapp')),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _needsSetup(BuildContext context) {
    final l = context.l10n;
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.qr_code_2_rounded,
                  size: 80, color: AppColors.primary),
              const SizedBox(height: 16),
              Text(l.t('set_payment_info'),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 20),
              BigButton(
                label: l.t('payment_details'),
                icon: Icons.settings_rounded,
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _receiveTo(BuildContext context, String target) {
    final l = context.l10n;
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          const Icon(Icons.account_balance_wallet_rounded,
              color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.t('payment_target'),
                    style: const TextStyle(
                        color: AppColors.textSecondaryLight, fontSize: 12)),
                Text(target,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 16)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _qrCard(BuildContext context, PaymentRequest? request) {
    final l = context.l10n;
    return AppCard(
      padding: const EdgeInsets.all(22),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(AppTheme.radius),
              border: Border.all(color: AppColors.dividerLight),
            ),
            child: request == null
                ? SizedBox(
                    width: 220,
                    height: 220,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.qr_code_2_rounded,
                              size: 90,
                              color: AppColors.primary.withValues(alpha: 0.3)),
                          const SizedBox(height: 8),
                          Text(l.t('amount_to_receive'),
                              style: const TextStyle(
                                  color: AppColors.textSecondaryLight)),
                        ],
                      ),
                    ),
                  )
                : QrImageView(
                    data: request.qrPayload,
                    version: QrVersions.auto,
                    size: 220,
                    gapless: false,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.circle,
                      color: AppColors.primaryDark,
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.circle,
                      color: AppColors.textPrimaryLight,
                    ),
                    embeddedImage: null,
                  ),
          ),
          const SizedBox(height: 14),
          Text(l.t('scan_to_pay'),
              style: const TextStyle(
                  fontWeight: FontWeight.w700, color: AppColors.primary)),
          if (request != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '${request.amount.toStringAsFixed(0)} ${l.t('currency')}',
                style: Theme.of(context)
                    .textTheme
                    .headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
        ],
      ),
    );
  }

  String _transferText(PaymentRequest request) {
    final settings = ref.read(settingsProvider);
    final isArabic = ref.read(isArabicProvider);
    return isArabic
        ? WhatsAppService.paymentShareAr(
            shopName: settings.shopName,
            amount: request.amount,
            target: request.target,
            link: request.deepLink)
        : WhatsAppService.paymentShareEn(
            shopName: settings.shopName,
            amount: request.amount,
            target: request.target,
            link: request.deepLink);
  }

  Future<void> _shareWhatsApp(PaymentRequest request) async {
    final ok = await WhatsAppService.send(message: _transferText(request));
    if (!ok && mounted) {
      showInfoFeedback(context, context.l10n.t('no_whatsapp'));
    }
  }

  Future<void> _copy(String text, String confirm) async {
    await Clipboard.setData(ClipboardData(text: text));
    Haptics.success();
    if (mounted) showInfoFeedback(context, confirm);
  }
}
