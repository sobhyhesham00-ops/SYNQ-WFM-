import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/services/pdf_report_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/haptics.dart';
import '../../data/models/merchant_settings.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/choice_selector.dart';
import '../../shared/widgets/feedback.dart';
import '../../shared/widgets/labeled_field.dart';
import '../../shared/widgets/section_header.dart';
import '../dashboard/financial_summary.dart';
import '../paywall/paywall.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _shop;
  late final TextEditingController _owner;
  late final TextEditingController _ipa;
  late final TextEditingController _wallet;

  @override
  void initState() {
    super.initState();
    final s = ref.read(settingsProvider);
    _shop = TextEditingController(text: s.shopName);
    _owner = TextEditingController(text: s.ownerName);
    _ipa = TextEditingController(text: s.instapayAddress);
    _wallet = TextEditingController(text: s.walletNumber);
  }

  @override
  void dispose() {
    _shop.dispose();
    _owner.dispose();
    _ipa.dispose();
    _wallet.dispose();
    super.dispose();
  }

  void _persist(MerchantSettings next) =>
      ref.read(settingsProvider.notifier).update(next);

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.t('settings'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 8, 18, 60),
        children: [
          // Language toggle
          SectionHeader(title: l.t('language')),
          AppCard(
            child: ChoiceSelector<String>(
              selected: settings.localeCode,
              onSelected: (code) =>
                  ref.read(settingsProvider.notifier).setLocale(code),
              items: [
                ChoiceItem(value: 'ar', label: l.t('arabic'), icon: Icons.language_rounded),
                ChoiceItem(value: 'en', label: l.t('english'), icon: Icons.language_rounded),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Appearance
          SectionHeader(title: l.t('theme')),
          AppCard(
            child: ChoiceSelector<String>(
              selected: settings.themeMode,
              onSelected: (mode) =>
                  ref.read(settingsProvider.notifier).setThemeMode(mode),
              items: [
                ChoiceItem(value: 'system', label: l.t('theme_system'), icon: Icons.brightness_auto_rounded),
                ChoiceItem(value: 'light', label: l.t('theme_light'), icon: Icons.light_mode_rounded),
                ChoiceItem(value: 'dark', label: l.t('theme_dark'), icon: Icons.dark_mode_rounded),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Merchant profile
          SectionHeader(title: l.t('merchant_profile')),
          AppCard(
            child: Column(
              children: [
                LabeledField(
                  label: l.t('shop_name'),
                  controller: _shop,
                  prefixIcon: Icons.storefront_rounded,
                  onChanged: (v) => _persist(settings.copyWith(shopName: v)),
                ),
                const SizedBox(height: 16),
                LabeledField(
                  label: l.t('owner_name'),
                  controller: _owner,
                  prefixIcon: Icons.person_rounded,
                  onChanged: (v) => _persist(settings.copyWith(ownerName: v)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Payment details
          SectionHeader(title: l.t('payment_details')),
          AppCard(
            child: Column(
              children: [
                LabeledField(
                  label: l.t('ipa_address'),
                  controller: _ipa,
                  hint: 'name@instapay',
                  prefixIcon: Icons.alternate_email_rounded,
                  onChanged: (v) =>
                      _persist(settings.copyWith(instapayAddress: v)),
                ),
                const SizedBox(height: 16),
                LabeledField(
                  label: l.t('wallet_number'),
                  controller: _wallet,
                  hint: '010xxxxxxxx',
                  keyboardType: TextInputType.phone,
                  prefixIcon: Icons.account_balance_wallet_rounded,
                  onChanged: (v) =>
                      _persist(settings.copyWith(walletNumber: v)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Premium & reports
          SectionHeader(title: l.t('premium')),
          _premiumCard(context, settings),
          const SizedBox(height: 12),
          AppCard(
            onTap: () => _exportPdf(context),
            child: Row(
              children: [
                const Icon(Icons.picture_as_pdf_rounded,
                    color: AppColors.cost),
                const SizedBox(width: 14),
                Expanded(child: Text(l.t('export_pdf'))),
                if (!settings.isPremium)
                  const Icon(Icons.lock_rounded,
                      color: AppColors.textSecondaryLight, size: 18),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // About
          SectionHeader(title: l.t('about')),
          AppCard(
            child: Column(
              children: [
                _aboutRow(l.t('version'), '1.0.0'),
                const Divider(),
                _aboutRow('${l.t('app_name')} · درجك', l.t('app_tagline')),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _premiumCard(BuildContext context, MerchantSettings settings) {
    final l = context.l10n;
    if (settings.isPremium) {
      return AppCard(
        color: AppColors.profit.withValues(alpha: 0.12),
        child: Row(
          children: [
            const Icon(Icons.workspace_premium_rounded,
                color: AppColors.profit),
            const SizedBox(width: 12),
            Expanded(
              child: Text('${l.t('premium')} ✓',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    }
    return AppCard(
      onTap: () => PaywallSheet.show(context, PaywallReason.pdfExport),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: AppColors.brandGradient),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.workspace_premium_rounded,
                color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.t('paywall_title'),
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(
                  l.t('price_per_month',
                      args: {'price': settings.monthlyPriceEgp.toString()}),
                  style: const TextStyle(
                      color: AppColors.textSecondaryLight, fontSize: 13),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded),
        ],
      ),
    );
  }

  Widget _aboutRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label),
            Text(value,
                style: const TextStyle(color: AppColors.textSecondaryLight)),
          ],
        ),
      );

  Future<void> _exportPdf(BuildContext context) async {
    final ok = await PremiumGate.ensure(context, ref,
        reason: PaywallReason.pdfExport);
    if (!ok || !context.mounted) return;

    Haptics.success();
    final isArabic = ref.read(isArabicProvider);
    final settings = ref.read(settingsProvider);
    final summary = ref.read(summaryProvider(ReportPeriod.month));
    await PdfReportService.generateAndShare(
      shopName: settings.shopName,
      monthLabel: Formatters.monthYear(DateTime.now(), isArabic: isArabic),
      summary: summary,
      isArabic: isArabic,
    );
  }
}
