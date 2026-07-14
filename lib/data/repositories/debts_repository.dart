import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/debt.dart';
import '../models/enums.dart';

class DebtsRepository {
  DebtsRepository(this._box);
  final Box<Debt> _box;
  static final _uuid = Uuid();

  Listenable get listenable => _box.listenable();

  List<Debt> all() {
    final list = _box.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  List<Debt> open() => all().where((d) => !d.settled).toList();

  /// Count of distinct customers with an open debt — drives the freemium
  /// paywall (Route 1) limit of 40 active customers.
  int activeCustomerCount() {
    final names = open()
        .map((d) => (d.phone?.trim().isNotEmpty ?? false)
            ? d.phone!.trim()
            : d.contactName.trim().toLowerCase())
        .where((k) => k.isNotEmpty)
        .toSet();
    return names.length;
  }

  double totalOwedToMe() =>
      open().where((d) => d.theyOweMe).fold(0.0, (s, d) => s + d.amount);

  double totalIOwe() =>
      open().where((d) => !d.theyOweMe).fold(0.0, (s, d) => s + d.amount);

  Future<Debt> add({
    required String contactName,
    required double amount,
    required DebtDirection direction,
    String? phone,
    DateTime? dueDate,
    String? note,
  }) async {
    final debt = Debt(
      id: _uuid.v4(),
      contactName: contactName,
      amount: amount,
      directionKey: direction.storageKey,
      phone: phone,
      dueDate: dueDate,
      note: note,
      createdAt: DateTime.now(),
    );
    await _box.put(debt.id, debt);
    return debt;
  }

  Future<void> setSettled(String id, bool settled) async {
    final debt = _box.get(id);
    if (debt == null) return;
    debt.settled = settled;
    await debt.save();
  }

  Future<void> delete(String id) => _box.delete(id);
}
