import 'package:hive/hive.dart';

import 'enums.dart';

/// A business expense: wholesale stock, rent, electricity, supplier payment, …
class Expense extends HiveObject {
  Expense({
    required this.id,
    required this.amount,
    required this.typeKey,
    required this.createdAt,
    this.supplierName,
    this.note,
  });

  final String id;
  double amount;
  String typeKey;
  String? supplierName;
  String? note;
  DateTime createdAt;

  ExpenseType get type => ExpenseType.fromKey(typeKey);
  bool get isCostOfStock => type.isCostOfStock;
}

class ExpenseAdapter extends TypeAdapter<Expense> {
  @override
  final int typeId = 2;

  @override
  Expense read(BinaryReader reader) {
    final fields = <int, dynamic>{
      for (var i = 0; i < reader.readByte(); i++) reader.readByte(): reader.read(),
    };
    return Expense(
      id: fields[0] as String,
      amount: (fields[1] as num).toDouble(),
      typeKey: fields[2] as String,
      supplierName: fields[3] as String?,
      note: fields[4] as String?,
      createdAt: fields[5] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, Expense obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.amount)
      ..writeByte(2)
      ..write(obj.typeKey)
      ..writeByte(3)
      ..write(obj.supplierName)
      ..writeByte(4)
      ..write(obj.note)
      ..writeByte(5)
      ..write(obj.createdAt);
  }
}
