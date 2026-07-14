import 'package:hive/hive.dart';

import 'enums.dart';

/// A Fawry / e-wallet service transaction executed by the merchant on behalf of
/// a customer (bill payment, recharge, cash in/out …).
///
/// The [commission] is the merchant's own profit and is tracked as a *separate*
/// revenue stream from product sales — the whole point of this log.
class FawryTransaction extends HiveObject {
  FawryTransaction({
    required this.id,
    required this.grossAmount,
    required this.commission,
    required this.serviceTypeKey,
    required this.createdAt,
    this.referenceNumber,
    this.customerPhone,
    this.note,
  });

  final String id;
  double grossAmount;
  double commission;
  String serviceTypeKey;
  String? referenceNumber;
  String? customerPhone;
  String? note;
  DateTime createdAt;

  ServiceType get serviceType => ServiceType.fromKey(serviceTypeKey);

  /// Anonymized service-velocity record for the B2B analytics foundation.
  Map<String, dynamic> toAnonymizedRecord() => {
        'service': serviceTypeKey,
        'gross': grossAmount,
        'commission': commission,
        'ts': createdAt.toIso8601String(),
      };
}

class FawryTransactionAdapter extends TypeAdapter<FawryTransaction> {
  @override
  final int typeId = 4;

  @override
  FawryTransaction read(BinaryReader reader) {
    final fields = <int, dynamic>{
      for (var i = 0; i < reader.readByte(); i++) reader.readByte(): reader.read(),
    };
    return FawryTransaction(
      id: fields[0] as String,
      grossAmount: (fields[1] as num).toDouble(),
      commission: (fields[2] as num).toDouble(),
      serviceTypeKey: fields[3] as String,
      referenceNumber: fields[4] as String?,
      customerPhone: fields[5] as String?,
      note: fields[6] as String?,
      createdAt: fields[7] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, FawryTransaction obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.grossAmount)
      ..writeByte(2)
      ..write(obj.commission)
      ..writeByte(3)
      ..write(obj.serviceTypeKey)
      ..writeByte(4)
      ..write(obj.referenceNumber)
      ..writeByte(5)
      ..write(obj.customerPhone)
      ..writeByte(6)
      ..write(obj.note)
      ..writeByte(7)
      ..write(obj.createdAt);
  }
}
