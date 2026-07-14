import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/enums.dart';
import '../models/expense.dart';

class ExpensesRepository {
  ExpensesRepository(this._box);
  final Box<Expense> _box;
  static final _uuid = Uuid();

  Listenable get listenable => _box.listenable();

  List<Expense> all() {
    final list = _box.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  List<Expense> inRange(DateTime start, DateTime end) => _box.values
      .where((e) => !e.createdAt.isBefore(start) && e.createdAt.isBefore(end))
      .toList();

  Future<Expense> add({
    required double amount,
    required ExpenseType type,
    String? supplierName,
    String? note,
    DateTime? createdAt,
  }) async {
    final expense = Expense(
      id: _uuid.v4(),
      amount: amount,
      typeKey: type.storageKey,
      supplierName: supplierName,
      note: note,
      createdAt: createdAt ?? DateTime.now(),
    );
    await _box.put(expense.id, expense);
    return expense;
  }

  Future<void> delete(String id) => _box.delete(id);
}
