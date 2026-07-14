import 'package:hive/hive.dart';

import 'enums.dart';

/// A single sale of physical product (product turnover).
class Sale extends HiveObject {
  Sale({
    required this.id,
    required this.amount,
    required this.paymentMethodKey,
    required this.categoryKey,
    required this.createdAt,
    this.quantity = 1,
    this.neighborhood,
    this.note,
  });

  final String id;
  double amount;
  String paymentMethodKey;
  String categoryKey;
  int quantity;
  String? neighborhood;
  String? note;
  DateTime createdAt;

  PaymentMethod get paymentMethod => PaymentMethod.fromKey(paymentMethodKey);
  ProductCategory get category => ProductCategory.fromKey(categoryKey);

  double get unitPrice => quantity == 0 ? amount : amount / quantity;

  /// Route 2 — B2B analytics foundation.
  ///
  /// Deliberately strips all personal identity (no customer name/phone is ever
  /// stored on a Sale to begin with) and exposes only aggregate-friendly,
  /// market-trend signals: category, volume, unit price and coarse geography.
  Map<String, dynamic> toAnonymizedRecord() => {
        'category': categoryKey,
        'quantity': quantity,
        'unit_price': double.parse(unitPrice.toStringAsFixed(2)),
        'gross': amount,
        'area': neighborhood, // coarse neighborhood, never an address
        'ts': createdAt.toIso8601String(),
      };
}

class SaleAdapter extends TypeAdapter<Sale> {
  @override
  final int typeId = 1;

  @override
  Sale read(BinaryReader reader) {
    final fields = <int, dynamic>{
      for (var i = 0; i < reader.readByte(); i++) reader.readByte(): reader.read(),
    };
    return Sale(
      id: fields[0] as String,
      amount: (fields[1] as num).toDouble(),
      paymentMethodKey: fields[2] as String,
      categoryKey: fields[3] as String,
      quantity: fields[4] as int? ?? 1,
      neighborhood: fields[5] as String?,
      note: fields[6] as String?,
      createdAt: fields[7] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, Sale obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.amount)
      ..writeByte(2)
      ..write(obj.paymentMethodKey)
      ..writeByte(3)
      ..write(obj.categoryKey)
      ..writeByte(4)
      ..write(obj.quantity)
      ..writeByte(5)
      ..write(obj.neighborhood)
      ..writeByte(6)
      ..write(obj.note)
      ..writeByte(7)
      ..write(obj.createdAt);
  }
}
