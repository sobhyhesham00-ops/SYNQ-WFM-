import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import '../models/enums.dart';
import '../models/fawry_transaction.dart';

class FawryRepository {
  FawryRepository(this._box);
  final Box<FawryTransaction> _box;
  static final _uuid = Uuid();

  Listenable get listenable => _box.listenable();

  List<FawryTransaction> all() {
    final list = _box.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  List<FawryTransaction> inRange(DateTime start, DateTime end) => _box.values
      .where((t) => !t.createdAt.isBefore(start) && t.createdAt.isBefore(end))
      .toList();

  Future<FawryTransaction> add({
    required double grossAmount,
    required double commission,
    required ServiceType serviceType,
    String? referenceNumber,
    String? customerPhone,
    String? note,
    DateTime? createdAt,
  }) async {
    final tx = FawryTransaction(
      id: _uuid.v4(),
      grossAmount: grossAmount,
      commission: commission,
      serviceTypeKey: serviceType.storageKey,
      referenceNumber: referenceNumber,
      customerPhone: customerPhone,
      note: note,
      createdAt: createdAt ?? DateTime.now(),
    );
    await _box.put(tx.id, tx);
    return tx;
  }

  Future<void> delete(String id) => _box.delete(id);

  List<Map<String, dynamic>> anonymizedExport() =>
      _box.values.map((t) => t.toAnonymizedRecord()).toList();
}
