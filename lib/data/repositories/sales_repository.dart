import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/enums.dart';
import '../models/sale.dart';

class SalesRepository {
  SalesRepository(this._box);
  final Box<Sale> _box;
  static final _uuid = Uuid();

  Listenable get listenable => _box.listenable();

  List<Sale> all() {
    final list = _box.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  List<Sale> inRange(DateTime start, DateTime end) => _box.values
      .where((s) => !s.createdAt.isBefore(start) && s.createdAt.isBefore(end))
      .toList();

  Future<Sale> add({
    required double amount,
    required PaymentMethod method,
    required ProductCategory category,
    int quantity = 1,
    String? neighborhood,
    String? note,
    DateTime? createdAt,
  }) async {
    final sale = Sale(
      id: _uuid.v4(),
      amount: amount,
      paymentMethodKey: method.storageKey,
      categoryKey: category.storageKey,
      quantity: quantity,
      neighborhood: neighborhood,
      note: note,
      createdAt: createdAt ?? DateTime.now(),
    );
    await _box.put(sale.id, sale);
    return sale;
  }

  Future<void> delete(String id) => _box.delete(id);

  /// Route 2 — anonymized, aggregate-only export for FMCG market analytics.
  List<Map<String, dynamic>> anonymizedExport() =>
      _box.values.map((s) => s.toAnonymizedRecord()).toList();
}
