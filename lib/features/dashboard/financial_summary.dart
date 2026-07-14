import '../../data/models/expense.dart';
import '../../data/models/fawry_transaction.dart';
import '../../data/models/sale.dart';

/// The reporting cycles shown on the dashboard.
enum ReportPeriod { day, week, month }

extension ReportPeriodRange on ReportPeriod {
  /// Returns the [start, end) window for `this` period relative to [now].
  (DateTime, DateTime) range([DateTime? now]) {
    final n = now ?? DateTime.now();
    switch (this) {
      case ReportPeriod.day:
        final start = DateTime(n.year, n.month, n.day);
        return (start, start.add(const Duration(days: 1)));
      case ReportPeriod.week:
        // Week starts Saturday in Egypt.
        final weekday = n.weekday; // Mon=1..Sun=7
        final daysSinceSat = (weekday + 1) % 7; // Sat -> 0
        final start = DateTime(n.year, n.month, n.day)
            .subtract(Duration(days: daysSinceSat));
        return (start, start.add(const Duration(days: 7)));
      case ReportPeriod.month:
        final start = DateTime(n.year, n.month);
        final end = DateTime(n.year, n.month + 1);
        return (start, end);
    }
  }
}

/// Immutable financial roll-up for a period. Cleanly separates *product
/// turnover* from *service revenue* so the merchant knows their pure profit.
class FinancialSummary {
  const FinancialSummary({
    required this.productRevenue,
    required this.stockCost,
    required this.bills,
    required this.serviceCommission,
    required this.serviceGross,
    required this.salesCount,
  });

  final double productRevenue; // sum of Sales
  final double stockCost; // wholesale stock expenses
  final double bills; // rent, electricity, salaries, other, supplier
  final double serviceCommission; // Fawry/wallet commission (pure profit)
  final double serviceGross; // Fawry/wallet gross throughput
  final int salesCount;

  /// Net Profit = (Sales − Stock Costs − Bills) + Service Commissions
  double get netProfit =>
      (productRevenue - stockCost - bills) + serviceCommission;

  double get totalExpenses => stockCost + bills;

  factory FinancialSummary.compute({
    required List<Sale> sales,
    required List<Expense> expenses,
    required List<FawryTransaction> fawry,
  }) {
    final productRevenue = sales.fold<double>(0, (s, e) => s + e.amount);
    var stockCost = 0.0;
    var bills = 0.0;
    for (final e in expenses) {
      if (e.isCostOfStock) {
        stockCost += e.amount;
      } else {
        bills += e.amount;
      }
    }
    final serviceCommission = fawry.fold<double>(0, (s, e) => s + e.commission);
    final serviceGross = fawry.fold<double>(0, (s, e) => s + e.grossAmount);

    return FinancialSummary(
      productRevenue: productRevenue,
      stockCost: stockCost,
      bills: bills,
      serviceCommission: serviceCommission,
      serviceGross: serviceGross,
      salesCount: sales.length,
    );
  }

  static const empty = FinancialSummary(
    productRevenue: 0,
    stockCost: 0,
    bills: 0,
    serviceCommission: 0,
    serviceGross: 0,
    salesCount: 0,
  );
}
