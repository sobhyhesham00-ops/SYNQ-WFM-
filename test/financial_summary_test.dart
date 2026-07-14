import 'package:dargak/data/models/enums.dart';
import 'package:dargak/data/models/expense.dart';
import 'package:dargak/data/models/fawry_transaction.dart';
import 'package:dargak/data/models/sale.dart';
import 'package:dargak/features/dashboard/financial_summary.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime(2026, 7, 14, 10);

  Sale sale(double amount) => Sale(
        id: amount.toString(),
        amount: amount,
        paymentMethodKey: PaymentMethod.cash.storageKey,
        categoryKey: ProductCategory.groceries.storageKey,
        createdAt: now,
      );

  Expense expense(double amount, ExpenseType type) => Expense(
        id: '$amount-$type',
        amount: amount,
        typeKey: type.storageKey,
        createdAt: now,
      );

  FawryTransaction fawry(double gross, double commission) => FawryTransaction(
        id: '$gross',
        grossAmount: gross,
        commission: commission,
        serviceTypeKey: ServiceType.bill.storageKey,
        createdAt: now,
      );

  group('FinancialSummary.compute', () {
    test('separates stock cost from bills and computes net profit', () {
      final summary = FinancialSummary.compute(
        sales: [sale(1000), sale(500)], // 1500 revenue
        expenses: [
          expense(600, ExpenseType.stock), // cost of stock
          expense(200, ExpenseType.rent), // bill
          expense(50, ExpenseType.electricity), // bill
        ],
        fawry: [fawry(300, 25), fawry(150, 10)], // 35 commission
      );

      expect(summary.productRevenue, 1500);
      expect(summary.stockCost, 600);
      expect(summary.bills, 250);
      expect(summary.serviceCommission, 35);
      expect(summary.serviceGross, 450);

      // Net Profit = (Sales − Stock − Bills) + Commissions
      //           = (1500 − 600 − 250) + 35 = 685
      expect(summary.netProfit, 685);
    });

    test('empty inputs yield zero everywhere', () {
      final summary = FinancialSummary.compute(
        sales: const [],
        expenses: const [],
        fawry: const [],
      );
      expect(summary.netProfit, 0);
      expect(summary.totalExpenses, 0);
      expect(summary.salesCount, 0);
    });

    test('service commission can carry a loss-making product side', () {
      final summary = FinancialSummary.compute(
        sales: [sale(100)],
        expenses: [expense(400, ExpenseType.stock)],
        fawry: [fawry(1000, 50)],
      );
      // (100 − 400 − 0) + 50 = -250
      expect(summary.netProfit, -250);
    });
  });

  group('ReportPeriod ranges', () {
    test('day range covers only the current calendar day', () {
      final (start, end) = ReportPeriod.day.range(now);
      expect(start, DateTime(2026, 7, 14));
      expect(end, DateTime(2026, 7, 15));
    });

    test('month range covers the full month', () {
      final (start, end) = ReportPeriod.month.range(now);
      expect(start, DateTime(2026, 7));
      expect(end, DateTime(2026, 8));
    });
  });
}
