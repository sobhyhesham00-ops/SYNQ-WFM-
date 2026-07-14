import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../data/hive/hive_boot.dart';
import '../../data/models/debt.dart';
import '../../data/models/expense.dart';
import '../../data/models/fawry_transaction.dart';
import '../../data/models/merchant_settings.dart';
import '../../data/models/sale.dart';
import '../../data/repositories/debts_repository.dart';
import '../../data/repositories/expenses_repository.dart';
import '../../data/repositories/fawry_repository.dart';
import '../../data/repositories/sales_repository.dart';
import '../../data/repositories/settings_repository.dart';
import '../../features/dashboard/financial_summary.dart';

// ── Boxes ────────────────────────────────────────────────────────────────
final _salesBoxProvider =
    Provider<Box<Sale>>((_) => Hive.box<Sale>(Boxes.sales));
final _expensesBoxProvider =
    Provider<Box<Expense>>((_) => Hive.box<Expense>(Boxes.expenses));
final _debtsBoxProvider =
    Provider<Box<Debt>>((_) => Hive.box<Debt>(Boxes.debts));
final _fawryBoxProvider =
    Provider<Box<FawryTransaction>>((_) => Hive.box<FawryTransaction>(Boxes.fawry));
final _settingsBoxProvider = Provider<Box>((_) => Hive.box(Boxes.settings));

// ── Repositories ───────────────────────────────────────────────────────────
final salesRepoProvider =
    Provider((ref) => SalesRepository(ref.watch(_salesBoxProvider)));
final expensesRepoProvider =
    Provider((ref) => ExpensesRepository(ref.watch(_expensesBoxProvider)));
final debtsRepoProvider =
    Provider((ref) => DebtsRepository(ref.watch(_debtsBoxProvider)));
final fawryRepoProvider =
    Provider((ref) => FawryRepository(ref.watch(_fawryBoxProvider)));
final settingsRepoProvider =
    Provider((ref) => SettingsRepository(ref.watch(_settingsBoxProvider)));

/// Bumps whenever any financial box changes, so computed providers and any
/// data-listing widget (even inside an [IndexedStack]) can refresh. Watch this
/// in any widget that reads a repository's list directly.
final dataRevisionProvider = StateProvider<int>((ref) {
  final salesRepo = ref.watch(salesRepoProvider);
  final expensesRepo = ref.watch(expensesRepoProvider);
  final debtsRepo = ref.watch(debtsRepoProvider);
  final fawryRepo = ref.watch(fawryRepoProvider);

  void bump() {
    // Guard against notifications during build.
    Future.microtask(() => ref.controller.state++);
  }

  salesRepo.listenable.addListener(bump);
  expensesRepo.listenable.addListener(bump);
  debtsRepo.listenable.addListener(bump);
  fawryRepo.listenable.addListener(bump);

  ref.onDispose(() {
    salesRepo.listenable.removeListener(bump);
    expensesRepo.listenable.removeListener(bump);
    debtsRepo.listenable.removeListener(bump);
    fawryRepo.listenable.removeListener(bump);
  });
  return 0;
});

// ── Settings / Locale / Theme ──────────────────────────────────────────────
class SettingsNotifier extends StateNotifier<MerchantSettings> {
  SettingsNotifier(this._repo) : super(_repo.load());
  final SettingsRepository _repo;

  Future<void> update(MerchantSettings next) async {
    state = next;
    await _repo.save(next);
  }

  Future<void> setLocale(String code) => update(state.copyWith(localeCode: code));
  Future<void> toggleLocale() =>
      setLocale(state.localeCode == 'ar' ? 'en' : 'ar');
  Future<void> setThemeMode(String mode) =>
      update(state.copyWith(themeMode: mode));
  Future<void> setPremium(bool v) => update(state.copyWith(isPremium: v));
}

final settingsProvider =
    StateNotifierProvider<SettingsNotifier, MerchantSettings>(
  (ref) => SettingsNotifier(ref.watch(settingsRepoProvider)),
);

final localeProvider = Provider<Locale>(
  (ref) => Locale(ref.watch(settingsProvider).localeCode),
);

final themeModeProvider = Provider<ThemeMode>((ref) {
  switch (ref.watch(settingsProvider).themeMode) {
    case 'light':
      return ThemeMode.light;
    case 'dark':
      return ThemeMode.dark;
    default:
      return ThemeMode.system;
  }
});

final isArabicProvider =
    Provider<bool>((ref) => ref.watch(settingsProvider).localeCode == 'ar');

// ── Dashboard summary ──────────────────────────────────────────────────────
final selectedPeriodProvider =
    StateProvider<ReportPeriod>((_) => ReportPeriod.day);

final summaryProvider = Provider.family<FinancialSummary, ReportPeriod>(
  (ref, period) {
    ref.watch(dataRevisionProvider);
    final (start, end) = period.range();
    return FinancialSummary.compute(
      sales: ref.watch(salesRepoProvider).inRange(start, end),
      expenses: ref.watch(expensesRepoProvider).inRange(start, end),
      fawry: ref.watch(fawryRepoProvider).inRange(start, end),
    );
  },
);

/// Number of active customers with an open debt (freemium gate input).
final activeCustomerCountProvider = Provider<int>((ref) {
  ref.watch(dataRevisionProvider);
  return ref.watch(debtsRepoProvider).activeCustomerCount();
});
