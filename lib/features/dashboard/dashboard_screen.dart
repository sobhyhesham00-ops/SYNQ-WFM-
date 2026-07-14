import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/choice_selector.dart';
import '../../shared/widgets/section_header.dart';
import '../expenses/add_expense_screen.dart';
import '../fawry/add_fawry_screen.dart';
import '../sales/add_sale_screen.dart';
import 'financial_summary.dart';
import 'widgets/breakdown_card.dart';
import 'widgets/summary_hero_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final isArabic = ref.watch(isArabicProvider);
    final settings = ref.watch(settingsProvider);
    final period = ref.watch(selectedPeriodProvider);
    final summary = ref.watch(summaryProvider(period));

    final periodLabel = switch (period) {
      ReportPeriod.day => l.t('today'),
      ReportPeriod.week => l.t('this_week'),
      ReportPeriod.month => l.t('this_month'),
    };

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async => ref.invalidate(summaryProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 120),
          children: [
            _greeting(context, settings.ownerName.isEmpty
                ? settings.shopName
                : settings.ownerName),
            const SizedBox(height: 16),
            _periodSelector(context, ref, period),
            const SizedBox(height: 18),
            SummaryHeroCard(
              summary: summary,
              isArabic: isArabic,
              periodLabel: periodLabel,
            ),
            const SizedBox(height: 18),
            BreakdownCard(summary: summary, isArabic: isArabic),
            const SizedBox(height: 24),
            SectionHeader(title: l.t('quick_actions')),
            _quickActions(context),
            const SizedBox(height: 24),
            SectionHeader(title: l.t('recent_activity')),
            _RecentActivity(isArabic: isArabic),
          ],
        ),
      ),
    );
  }

  Widget _greeting(BuildContext context, String name) {
    final l = context.l10n;
    final theme = Theme.of(context);
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: AppColors.brandGradient),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(Icons.storefront_rounded, color: Colors.white),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.t('welcome_back'),
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: AppColors.textSecondaryLight)),
              Text(
                name.isEmpty ? l.t('app_name') : name,
                style: theme.textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        Icon(Icons.notifications_none_rounded,
            color: theme.iconTheme.color, size: 28),
      ],
    );
  }

  Widget _periodSelector(
      BuildContext context, WidgetRef ref, ReportPeriod period) {
    final l = context.l10n;
    return ChoiceSelector<ReportPeriod>(
      selected: period,
      onSelected: (p) =>
          ref.read(selectedPeriodProvider.notifier).state = p,
      items: [
        ChoiceItem(value: ReportPeriod.day, label: l.t('today')),
        ChoiceItem(value: ReportPeriod.week, label: l.t('this_week')),
        ChoiceItem(value: ReportPeriod.month, label: l.t('this_month')),
      ],
    );
  }

  Widget _quickActions(BuildContext context) {
    final l = context.l10n;
    final actions = [
      (
        Icons.add_shopping_cart_rounded,
        l.t('add_sale'),
        AppColors.revenue,
        () => _open(context, const AddSaleScreen())
      ),
      (
        Icons.receipt_long_rounded,
        l.t('add_expense'),
        AppColors.cost,
        () => _open(context, const AddExpenseScreen())
      ),
      (
        Icons.bolt_rounded,
        l.t('add_fawry'),
        AppColors.service,
        () => _open(context, const AddFawryScreen())
      ),
    ];
    return Row(
      children: actions
          .map((a) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  child: _actionTile(context, a.$1, a.$2, a.$3, a.$4),
                ),
              ))
          .toList(),
    );
  }

  Widget _actionTile(BuildContext context, IconData icon, String label,
      Color color, VoidCallback onTap) {
    final theme = Theme.of(context);
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 10),
          Text(label,
              textAlign: TextAlign.center,
              maxLines: 2,
              style: theme.textTheme.labelMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  static void _open(BuildContext context, Widget screen) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));
  }
}

/// Latest few entries across sales, expenses and fawry, merged by time.
class _RecentActivity extends ConsumerWidget {
  const _RecentActivity({required this.isArabic});
  final bool isArabic;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    ref.watch(settingsProvider); // rebuild on locale change
    ref.watch(dataRevisionProvider);
    final sales = ref.watch(salesRepoProvider).all();
    final expenses = ref.watch(expensesRepoProvider).all();
    final fawry = ref.watch(fawryRepoProvider).all();

    final entries = <_Entry>[
      ...sales.map((s) => _Entry(
            title: context.l10n.t(s.category.labelKey),
            subtitle: context.l10n.t(s.paymentMethod.labelKey),
            amount: s.amount,
            positive: true,
            icon: Icons.shopping_bag_rounded,
            color: AppColors.revenue,
            time: s.createdAt,
          )),
      ...expenses.map((e) => _Entry(
            title: context.l10n.t(e.type.labelKey),
            subtitle: e.supplierName ?? '',
            amount: e.amount,
            positive: false,
            icon: Icons.receipt_long_rounded,
            color: AppColors.cost,
            time: e.createdAt,
          )),
      ...fawry.map((f) => _Entry(
            title: context.l10n.t(f.serviceType.labelKey),
            subtitle: '+${f.commission.toStringAsFixed(0)}',
            amount: f.grossAmount,
            positive: true,
            icon: Icons.bolt_rounded,
            color: AppColors.service,
            time: f.createdAt,
          )),
    ]..sort((a, b) => b.time.compareTo(a.time));

    if (entries.isEmpty) {
      return AppCard(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Text(l.t('no_activity'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondaryLight)),
        ),
      );
    }

    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      child: Column(
        children: entries.take(6).map((e) => _tile(context, e)).toList(),
      ),
    );
  }

  Widget _tile(BuildContext context, _Entry e) {
    final theme = Theme.of(context);
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 10),
      leading: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: e.color.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(e.icon, color: e.color, size: 22),
      ),
      title: Text(e.title,
          style: theme.textTheme.titleSmall
              ?.copyWith(fontWeight: FontWeight.w700)),
      subtitle: Text(
        Formatters.dateTime(e.time, isArabic: isArabic),
        style: theme.textTheme.bodySmall,
      ),
      trailing: Text(
        '${e.positive ? '+' : '−'}${Formatters.money(e.amount, isArabic: isArabic)}',
        style: theme.textTheme.titleSmall?.copyWith(
          color: e.positive ? AppColors.profit : AppColors.cost,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _Entry {
  _Entry({
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.positive,
    required this.icon,
    required this.color,
    required this.time,
  });
  final String title;
  final String subtitle;
  final double amount;
  final bool positive;
  final IconData icon;
  final Color color;
  final DateTime time;
}
