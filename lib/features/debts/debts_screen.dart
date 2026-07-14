import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/localization/app_localizations.dart';
import '../../core/services/payment_link_service.dart';
import '../../core/services/whatsapp_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/debt.dart';
import '../../shared/providers/app_providers.dart';
import '../../shared/widgets/app_card.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/feedback.dart';
import '../paywall/paywall.dart';
import 'add_debt_screen.dart';

class DebtsScreen extends ConsumerWidget {
  const DebtsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final isArabic = ref.watch(isArabicProvider);
    final repo = ref.watch(debtsRepoProvider);
    ref.watch(settingsProvider);
    ref.watch(dataRevisionProvider);
    final debts = repo.open();

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
            child: Row(
              children: [
                Text(l.t('nav_debts'),
                    style: Theme.of(context)
                        .textTheme
                        .headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const Spacer(),
                FilledButton.icon(
                  onPressed: () => _addDebt(context, ref),
                  icon: const Icon(Icons.add_rounded),
                  label: Text(l.t('add_debt')),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Expanded(
                  child: _totalCard(
                    context,
                    label: l.t('total_owed_to_me'),
                    value: repo.totalOwedToMe(),
                    color: AppColors.owedToMe,
                    isArabic: isArabic,
                    icon: Icons.call_received_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _totalCard(
                    context,
                    label: l.t('total_i_owe'),
                    value: repo.totalIOwe(),
                    color: AppColors.iOwe,
                    isArabic: isArabic,
                    icon: Icons.call_made_rounded,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: debts.isEmpty
                ? EmptyState(
                    message: l.t('no_debts'),
                    icon: Icons.handshake_rounded)
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(18, 0, 18, 120),
                    itemCount: debts.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) =>
                        _DebtTile(debt: debts[i], isArabic: isArabic),
                  ),
          ),
        ],
      ),
    );
  }

  Future<void> _addDebt(BuildContext context, WidgetRef ref) async {
    // Route 1 freemium gate: cap at 40 active customers.
    final ok = await PremiumGate.ensure(context, ref,
        reason: PaywallReason.customerLimit);
    if (!ok || !context.mounted) return;
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const AddDebtScreen()));
  }

  Widget _totalCard(BuildContext context,
      {required String label,
      required double value,
      required Color color,
      required bool isArabic,
      required IconData icon}) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(height: 10),
          Text(label,
              style: const TextStyle(
                  color: AppColors.textSecondaryLight, fontSize: 13)),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              Formatters.moneyWithUnit(value, isArabic: isArabic),
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800, color: color),
            ),
          ),
        ],
      ),
    );
  }
}

class _DebtTile extends ConsumerWidget {
  const _DebtTile({required this.debt, required this.isArabic});
  final Debt debt;
  final bool isArabic;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final color = debt.theyOweMe ? AppColors.owedToMe : AppColors.iOwe;

    return AppCard(
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: color.withValues(alpha: 0.15),
                child: Text(
                  debt.contactName.isNotEmpty
                      ? debt.contactName.characters.first
                      : '؟',
                  style: TextStyle(color: color, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(debt.contactName,
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700)),
                    Text(
                      '${l.t(debt.direction.labelKey)} · ${Formatters.date(debt.createdAt, isArabic: isArabic)}',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Text(
                Formatters.moneyWithUnit(debt.amount, isArabic: isArabic),
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800, color: color),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              if (debt.theyOweMe)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _sendReminder(context, ref),
                    icon: const Icon(Icons.chat_rounded, size: 18),
                    label: Text(l.t('send_reminder')),
                  ),
                ),
              if (debt.theyOweMe) const SizedBox(width: 10),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () async {
                    await ref
                        .read(debtsRepoProvider)
                        .setSettled(debt.id, true);
                  },
                  style: FilledButton.styleFrom(
                      backgroundColor: AppColors.profit),
                  icon: const Icon(Icons.check_rounded, size: 18),
                  label: Text(l.t('mark_settled')),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// WhatsApp automated chasing engine — pulls name, amount and a payment link
  /// into a polite pre-written template in the active language.
  Future<void> _sendReminder(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final settings = ref.read(settingsProvider);

    String? link;
    if (settings.hasPaymentInfo) {
      link = PaymentLinkService.build(settings: settings, amount: debt.amount)
          .deepLink;
    }

    final message = isArabic
        ? WhatsAppService.debtReminderAr(
            name: debt.contactName, amount: debt.amount, paymentLink: link)
        : WhatsAppService.debtReminderEn(
            name: debt.contactName, amount: debt.amount, paymentLink: link);

    final ok = await WhatsAppService.send(phone: debt.phone, message: message);
    if (!ok && context.mounted) {
      showInfoFeedback(context, l.t('no_whatsapp'));
    }
  }
}
