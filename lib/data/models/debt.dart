import 'package:hive/hive.dart';

import 'enums.dart';

/// A debt linked to a person (customer or supplier), optionally to a contact.
class Debt extends HiveObject {
  Debt({
    required this.id,
    required this.contactName,
    required this.amount,
    required this.directionKey,
    required this.createdAt,
    this.phone,
    this.dueDate,
    this.note,
    this.settled = false,
  });

  final String id;
  String contactName;
  String? phone;
  double amount;
  String directionKey;
  DateTime? dueDate;
  String? note;
  bool settled;
  DateTime createdAt;

  DebtDirection get direction => DebtDirection.fromKey(directionKey);
  bool get theyOweMe => direction == DebtDirection.theyOweMe;
}

class DebtAdapter extends TypeAdapter<Debt> {
  @override
  final int typeId = 3;

  @override
  Debt read(BinaryReader reader) {
    final fields = <int, dynamic>{
      for (var i = 0; i < reader.readByte(); i++) reader.readByte(): reader.read(),
    };
    return Debt(
      id: fields[0] as String,
      contactName: fields[1] as String,
      phone: fields[2] as String?,
      amount: (fields[3] as num).toDouble(),
      directionKey: fields[4] as String,
      dueDate: fields[5] as DateTime?,
      note: fields[6] as String?,
      settled: fields[7] as bool? ?? false,
      createdAt: fields[8] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, Debt obj) {
    writer
      ..writeByte(9)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.contactName)
      ..writeByte(2)
      ..write(obj.phone)
      ..writeByte(3)
      ..write(obj.amount)
      ..writeByte(4)
      ..write(obj.directionKey)
      ..writeByte(5)
      ..write(obj.dueDate)
      ..writeByte(6)
      ..write(obj.note)
      ..writeByte(7)
      ..write(obj.settled)
      ..writeByte(8)
      ..write(obj.createdAt);
  }
}
