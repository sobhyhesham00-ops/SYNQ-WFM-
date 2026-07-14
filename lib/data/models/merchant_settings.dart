/// Plain (non-Hive) settings model. Persisted as individual key/value pairs in
/// secure storage + a small Hive settings box, so it needs no adapter.
class MerchantSettings {
  const MerchantSettings({
    this.shopName = '',
    this.ownerName = '',
    this.instapayAddress = '',
    this.walletNumber = '',
    this.localeCode = 'ar',
    this.themeMode = 'system',
    this.isPremium = false,
    this.monthlyPriceEgp = 75,
  });

  final String shopName;
  final String ownerName;
  final String instapayAddress; // e.g. name@instapay
  final String walletNumber; // e.g. 010xxxxxxxx
  final String localeCode; // 'ar' | 'en'
  final String themeMode; // 'system' | 'light' | 'dark'
  final bool isPremium;
  final int monthlyPriceEgp; // 50–100 EGP tier

  bool get hasPaymentInfo =>
      instapayAddress.trim().isNotEmpty || walletNumber.trim().isNotEmpty;

  MerchantSettings copyWith({
    String? shopName,
    String? ownerName,
    String? instapayAddress,
    String? walletNumber,
    String? localeCode,
    String? themeMode,
    bool? isPremium,
    int? monthlyPriceEgp,
  }) {
    return MerchantSettings(
      shopName: shopName ?? this.shopName,
      ownerName: ownerName ?? this.ownerName,
      instapayAddress: instapayAddress ?? this.instapayAddress,
      walletNumber: walletNumber ?? this.walletNumber,
      localeCode: localeCode ?? this.localeCode,
      themeMode: themeMode ?? this.themeMode,
      isPremium: isPremium ?? this.isPremium,
      monthlyPriceEgp: monthlyPriceEgp ?? this.monthlyPriceEgp,
    );
  }

  Map<String, dynamic> toMap() => {
        'shopName': shopName,
        'ownerName': ownerName,
        'instapayAddress': instapayAddress,
        'walletNumber': walletNumber,
        'localeCode': localeCode,
        'themeMode': themeMode,
        'isPremium': isPremium,
        'monthlyPriceEgp': monthlyPriceEgp,
      };

  factory MerchantSettings.fromMap(Map<dynamic, dynamic> map) {
    return MerchantSettings(
      shopName: map['shopName'] as String? ?? '',
      ownerName: map['ownerName'] as String? ?? '',
      instapayAddress: map['instapayAddress'] as String? ?? '',
      walletNumber: map['walletNumber'] as String? ?? '',
      localeCode: map['localeCode'] as String? ?? 'ar',
      themeMode: map['themeMode'] as String? ?? 'system',
      isPremium: map['isPremium'] as bool? ?? false,
      monthlyPriceEgp: map['monthlyPriceEgp'] as int? ?? 75,
    );
  }
}
