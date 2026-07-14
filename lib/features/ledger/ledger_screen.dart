import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/haptics.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/empty_state.dart';

class LedgerScreen extends ConsumerWidget {
  const LedgerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final isArabic = ref.watch(isArabicProvider);
    ref.watch(settingsProvider);

    return DefaultTabController(
      length: 3,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
              child: Row(
                children: [
                  Text(l.t('nav_ledger'),
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              indicatorColor: AppColors.primary,
              labelColor: AppColors.primary,
              dividerColor: Colors.transparent,
              labelStyle: const TextStyle(fontWeight: FontWeight.w700),
              tabs: [
                Tab(text: l.t('sales')),
                Tab(text: l.t('expenses')),
                Tab(text: l.t('fawry')),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _SalesList(isArabic: isArabic),
                  _ExpensesList(isArabic: isArabic),
                  _FawryList(isArabic: isArabic),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SalesList extends ConsumerWidget {
  const _SalesList({required this.isArabic});
  final bool isArabic;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    ref.watch(dataRevisionProvider);
    final items = ref.watch(salesRepoProvider).all();
    if (items.isEmpty) {
      return EmptyState(message: l.t('no_activity'), icon: Icons.shopping_bag_rounded);
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 120),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final s = items[i];
        return _EntryTile(
          icon: Icons.shopping_bag_rounded,
          color: AppColors.revenue,
          title: l.t(s.category.labelKey),
          subtitle:
              '${l.t(s.paymentMethod.labelKey)} · ${Formatters.dateTime(s.createdAt, isArabic: isArabic)}',
          amount: '+${Formatters.money(s.amount, isArabic: isArabic)}',
          amountColor: AppColors.profit,
          onDelete: () => ref.read(salesRepoProvider).delete(s.id),
        );
      },
    );
  }
}

class _ExpensesList extends ConsumerWidget {
  const _ExpensesList({required this.isArabic});
  final bool isArabic;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    ref.watch(dataRevisionProvider);
    final items = ref.watch(expensesRepoProvider).all();
    if (items.isEmpty) {
      return EmptyState(message: l.t('no_activity'), icon: Icons.receipt_long_rounded);
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 120),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final e = items[i];
        return _EntryTile(
          icon: Icons.receipt_long_rounded,
          color: AppColors.cost,
          title: l.t(e.type.labelKey),
          subtitle: [
            if (e.supplierName != null && e.supplierName!.isNotEmpty)
              e.supplierName!,
            Formatters.dateTime(e.createdAt, isArabic: isArabic),
          ].join(' · '),
          amount: '−${Formatters.money(e.amount, isArabic: isArabic)}',
          amountColor: AppColors.cost,
          onDelete: () => ref.read(expensesRepoProvider).delete(e.id),
        );
      },
    );
  }
}

class _FawryList extends ConsumerWidget {
  const _FawryList({required this.isArabic});
  final bool isArabic;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    ref.watch(dataRevisionProvider);
    final items = ref.watch(fawryRepoProvider).all();
    final totalCommission =
        items.fold<double>(0, (s, e) => s + e.commission);

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 120),
      children: [
        AppCard(
          color: AppColors.service.withValues(alpha: 0.12),
          child: Row(
            children: [
              const Icon(Icons.bolt_rounded, color: AppColors.service, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(l.t('total_commission'),
                        style: const TextStyle(
                            color: AppColors.textSecondaryLight)),
                    Text(
                      Formatters.moneyWithUnit(totalCommission,
                          isArabic: isArabic),
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: AppColors.service),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (items.isEmpty)
          EmptyState(message: l.t('no_activity'), icon: Icons.bolt_rounded)
        else
          ...items.map((f) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _EntryTile(
                  icon: Icons.bolt_rounded,
                  color: AppColors.service,
                  title: l.t(f.serviceType.labelKey),
                  subtitle: [
                    if (f.referenceNumber != null &&
                        f.referenceNumber!.isNotEmpty)
                      '#${f.referenceNumber}',
                    Formatters.dateTime(f.createdAt, isArabic: isArabic),
                  ].join(' · '),
                  amount: Formatters.money(f.grossAmount, isArabic: isArabic),
                  amountColor: AppColors.textPrimaryLight,
                  badge:
                      '+${Formatters.money(f.commission, isArabic: isArabic)}',
                  onDelete: () => ref.read(fawryRepoProvider).delete(f.id),
                ),
              )),
      ],
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.amountColor,
    required this.onDelete,
    this.badge,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final String amount;
  final Color amountColor;
  final String? badge;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final theme = Theme.of(context);
    return Dismissible(
      key: ValueKey(title + subtitle + amount),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: AlignmentDirectional.centerEnd,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        decoration: BoxDecoration(
          color: AppColors.cost,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Icon(Icons.delete_rounded, color: Colors.white),
      ),
      confirmDismiss: (_) async {
        Haptics.warning();
        return showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            content: Text(l.t('delete_confirm')),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: Text(l.t('cancel'))),
              FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: Text(l.t('delete'))),
            ],
          ),
        );
      },
      onDismissed: (_) => onDelete(),
      child: AppCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  Text(subtitle,
                      style: theme.textTheme.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(amount,
                    style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800, color: amountColor)),
                if (badge != null)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.profit.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(badge!,
                        style: const TextStyle(
                            color: AppColors.profit,
                            fontWeight: FontWeight.w700,
                            fontSize: 12)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
