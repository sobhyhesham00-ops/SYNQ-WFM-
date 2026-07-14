import 'package:flutter/material.dart';

import '../../../core/localization/app_localizations.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/widgets/app_card.dart';
import '../financial_summary.dart';

/// Detailed line-by-line breakdown of the Net Profit formula.
class BreakdownCard extends StatelessWidget {
  const BreakdownCard(
      {super.key, required this.summary, required this.isArabic});
  final FinancialSummary summary;
  final bool isArabic;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AppCard(
      child: Column(
        children: [
          _line(context, l.t('total_revenue'), summary.productRevenue,
              AppColors.revenue, sign: '+'),
          _line(context, l.t('stock_cost'), summary.stockCost, AppColors.cost,
              sign: '−'),
          _line(context, l.t('bills'), summary.bills, AppColors.cost,
              sign: '−'),
          _line(context, l.t('service_commission'), summary.serviceCommission,
              AppColors.service,
              sign: '+'),
          const Divider(height: 26),
          _line(context, l.t('net_profit'), summary.netProfit,
              AppColors.profit,
              sign: '=', bold: true),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, String label, double value, Color color,
      {required String sign, bool bold = false}) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label,
                style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: bold ? FontWeight.w800 : FontWeight.w500)),
          ),
          Text('$sign ',
              style: TextStyle(color: color, fontWeight: FontWeight.w700)),
          Text(
            Formatters.moneyWithUnit(value, isArabic: isArabic),
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w700,
              color: bold ? color : null,
            ),
          ),
        ],
      ),
    );
  }
}
