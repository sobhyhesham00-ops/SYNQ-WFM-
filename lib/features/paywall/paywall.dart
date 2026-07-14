import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/haptics.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/big_button.dart';

/// Why the paywall was triggered.
enum PaywallReason { customerLimit, pdfExport }

/// Route 1 — Freemium. Free tier caps at 40 active customers; PDF reports are
/// Pro. This gate centralizes the checks so any feature can call it.
class PremiumGate {
  PremiumGate._();

  static const int freeCustomerLimit = 40;

  /// Returns true if the action may proceed. Otherwise shows the paywall and
  /// returns false.
  static Future<bool> ensure(
    BuildContext context,
    WidgetRef ref, {
    required PaywallReason reason,
  }) async {
    final settings = ref.read(settingsProvider);
    if (settings.isPremium) return true;

    if (reason == PaywallReason.customerLimit) {
      final count = ref.read(activeCustomerCountProvider);
      if (count < freeCustomerLimit) return true;
    }

    if (context.mounted) {
      await PaywallSheet.show(context, reason);
    }
    // After the sheet, re-check premium (user may have unlocked).
    return ref.read(settingsProvider).isPremium &&
        (reason != PaywallReason.customerLimit ||
            ref.read(activeCustomerCountProvider) < freeCustomerLimit ||
            ref.read(settingsProvider).isPremium);
  }
}

class PaywallSheet extends ConsumerWidget {
  const PaywallSheet({super.key, required this.reason});
  final PaywallReason reason;

  static Future<void> show(BuildContext context, PaywallReason reason) {
    Haptics.warning();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => PaywallSheet(reason: reason),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final settings = ref.watch(settingsProvider);
    final price = settings.monthlyPriceEgp.toString();

    final reasonText = reason == PaywallReason.customerLimit
        ? l.t('paywall_reason_customers')
        : l.t('paywall_reason_pdf');

    final features = [
      (Icons.groups_rounded, l.t('feat_unlimited_customers')),
      (Icons.picture_as_pdf_rounded, l.t('feat_pdf')),
      (Icons.cloud_done_rounded, l.t('feat_backup')),
      (Icons.insights_rounded, l.t('feat_insights')),
    ];

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: AppColors.textSecondaryLight.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: AppColors.brandGradient),
                borderRadius: BorderRadius.circular(AppTheme.radius),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.workspace_premium_rounded,
                          color: Colors.white, size: 28),
                      const SizedBox(width: 10),
                      Text(l.t('paywall_title'),
                          style: theme.textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(l.t('paywall_sub'),
                      style: const TextStyle(color: Colors.white70)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.service.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_rounded, color: AppColors.service),
                  const SizedBox(width: 10),
                  Expanded(child: Text(reasonText)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            ...features.map((f) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Icon(f.$1, color: AppColors.profit, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                          child: Text(f.$2,
                              style: theme.textTheme.titleSmall)),
                      const Icon(Icons.check_circle_rounded,
                          color: AppColors.profit, size: 20),
                    ],
                  ),
                )),
            const SizedBox(height: 16),
            Center(
              child: Text(
                l.t('price_per_month', args: {'price': price}),
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(height: 4),
            Center(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.profit.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(l.t('most_popular'),
                    style: const TextStyle(
                        color: AppColors.profit,
                        fontWeight: FontWeight.w700,
                        fontSize: 12)),
              ),
            ),
            const SizedBox(height: 20),
            // Local billing triggers (placeholders for real integration).
            BigButton(
              label: l.t('pay_fawry'),
              icon: Icons.link_rounded,
              onPressed: () => _payFawry(context, ref),
            ),
            const SizedBox(height: 12),
            BigButton(
              label: l.t('pay_vodafone'),
              icon: Icons.phone_iphone_rounded,
              gradient: const [Color(0xFFE60000), Color(0xFFFF4D4D)],
              onPressed: () => _payVodafone(context, ref),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(l.t('maybe_later')),
            ),
          ],
        ),
      ),
    );
  }

  // Placeholder: open a Fawry Pay-by-Link URL. In production this URL is issued
  // by the backend per-merchant with the correct amount & merchant code.
  Future<void> _payFawry(BuildContext context, WidgetRef ref) async {
    final price = ref.read(settingsProvider).monthlyPriceEgp;
    final uri = Uri.parse('https://atfawry.fawrystaging.com/pay-by-link'
        '?amount=$price&currency=EGP&item=Dargak-Pro');
    await _tryLaunch(uri);
    if (context.mounted) _confirmManualUnlock(context, ref);
  }

  // Placeholder: Vodafone Cash manual transfer approval flow.
  Future<void> _payVodafone(BuildContext context, WidgetRef ref) async {
    // Real flow: show merchant number, user transfers, admin approves.
    _confirmManualUnlock(context, ref);
  }

  Future<void> _tryLaunch(Uri uri) async {
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _confirmManualUnlock(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(l.t('premium')),
        content: Text(l.t('pay_vodafone')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(l.t('cancel'))),
          FilledButton(
            onPressed: () {
              // Placeholder for verified activation via backend/webhook.
              ref.read(settingsProvider.notifier).setPremium(true);
              Haptics.success();
              Navigator.pop(context); // dialog
              Navigator.pop(context); // sheet
            },
            child: Text(l.t('confirm')),
          ),
        ],
      ),
    );
  }
}
