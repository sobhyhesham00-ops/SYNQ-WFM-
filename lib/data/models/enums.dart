/// Domain enums shared across models. Each carries a stable [storageKey] that is
/// what we persist in Hive (index-independent) and a [labelKey] into
/// AppStrings for localized display.

enum PaymentMethod {
  cash('cash', 'cash'),
  instapay('instapay', 'instapay'),
  wallet('wallet', 'wallet'),
  card('card', 'card');

  const PaymentMethod(this.storageKey, this.labelKey);
  final String storageKey;
  final String labelKey;

  static PaymentMethod fromKey(String key) =>
      PaymentMethod.values.firstWhere((e) => e.storageKey == key,
          orElse: () => PaymentMethod.cash);
}

enum ProductCategory {
  vegetables('vegetables', 'cat_vegetables'),
  groceries('groceries', 'cat_groceries'),
  beverages('beverages', 'cat_beverages'),
  dairy('dairy', 'cat_dairy'),
  snacks('snacks', 'cat_snacks'),
  cigarettes('cigarettes', 'cat_cigarettes'),
  pharmacy('pharmacy', 'cat_pharmacy'),
  other('other', 'cat_other');

  const ProductCategory(this.storageKey, this.labelKey);
  final String storageKey;
  final String labelKey;

  static ProductCategory fromKey(String key) =>
      ProductCategory.values.firstWhere((e) => e.storageKey == key,
          orElse: () => ProductCategory.other);
}

enum ExpenseType {
  stock('stock', 'exp_stock'),
  rent('rent', 'exp_rent'),
  electricity('electricity', 'exp_electricity'),
  supplier('supplier', 'exp_supplier'),
  salaries('salaries', 'exp_salaries'),
  other('other', 'exp_other');

  const ExpenseType(this.storageKey, this.labelKey);
  final String storageKey;
  final String labelKey;

  /// Wholesale stock is treated as "cost of goods" in the profit formula,
  /// everything else is a "bill".
  bool get isCostOfStock => this == ExpenseType.stock;

  static ExpenseType fromKey(String key) =>
      ExpenseType.values.firstWhere((e) => e.storageKey == key,
          orElse: () => ExpenseType.other);
}

/// Debt direction. In Egyptian shop language:
///  - `theyOweMe` == "عليه" (the customer owes the merchant)
///  - `iOweThem`  == "ليه"  (the merchant owes a supplier/person)
enum DebtDirection {
  theyOweMe('they_owe_me', 'debt_owed_to_me'),
  iOweThem('i_owe_them', 'debt_i_owe');

  const DebtDirection(this.storageKey, this.labelKey);
  final String storageKey;
  final String labelKey;

  static DebtDirection fromKey(String key) =>
      DebtDirection.values.firstWhere((e) => e.storageKey == key,
          orElse: () => DebtDirection.theyOweMe);
}

enum ServiceType {
  bill('bill', 'svc_bill'),
  recharge('recharge', 'svc_recharge'),
  ewallet('ewallet', 'svc_ewallet'),
  internet('internet', 'svc_internet'),
  government('government', 'svc_gov'),
  other('other', 'svc_other');

  const ServiceType(this.storageKey, this.labelKey);
  final String storageKey;
  final String labelKey;

  static ServiceType fromKey(String key) =>
      ServiceType.values.firstWhere((e) => e.storageKey == key,
          orElse: () => ServiceType.other);
}
