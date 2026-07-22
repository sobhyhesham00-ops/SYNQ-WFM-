// Lightweight bilingual strings (English + Egyptian Arabic) for the driver app.
// A global ValueNotifier flips language app-wide; MaterialApp picks up the
// locale (and RTL for Arabic) via flutter_localizations.
import 'package:flutter/foundation.dart';

final langNotifier = ValueNotifier<String>('ar'); // Arabic-first

void toggleLang() => langNotifier.value = langNotifier.value == 'ar' ? 'en' : 'ar';

const Map<String, Map<String, String>> _dict = {
  'en': {
    'signIn': 'Sign in',
    'invalidCreds': 'Wrong phone or PIN',
    'noOrders': 'No active orders right now',
    'driverSignIn': 'Driver sign in',
    'phone': 'Phone number',
    'pin': 'PIN',
    'startShift': 'Start shift',
    'endShift': 'End shift',
    'locationOn': 'Location sharing on',
    'myOrders': 'My orders',
    'myCash': 'My cash',
    'cashInHand': 'CASH IN HAND (OWED TO CASHIER)',
    'deliveriesToday': '{n} deliveries today',
    'collectedToday': 'Collected today',
    'handedOver': 'Handed over',
    'todaysDeliveries': "Today's deliveries",
    'carrying': 'Carrying',
    'handedOverBadge': 'Handed over',
    'activeDelivery': 'Active delivery',
    'collectFromCustomer': 'COLLECT FROM CUSTOMER',
    'navigate': 'Navigate in Google Maps',
    'pickedUp': 'Picked up',
    'delivered': 'Delivered & cash collected',
    'status': 'Status',
    'prescriptionReq': 'Prescription required',
    'locationNeeded': "Location is off — the shop can't see you. Turn on location to start your shift.",
    'openSettings': 'Open settings',
    'couldntDeliver': "Couldn't deliver",
    'whyFailed': "What happened?",
    'notHome': 'Customer not home',
    'refused': 'Customer refused',
    'wrongAddress': 'Wrong / unreachable address',
    'newOrder': 'New order · {addr}',
    'view': 'View',
    'deliveryCode': 'Delivery code',
    'wrongCode': 'Wrong code',
    'couldntOpenMaps': "Couldn't open Maps",
    'actionFailed': 'Something went wrong — try again',
    'st.Pending': 'Pending',
    'st.Assigned': 'Assigned',
    'st.PickedUp': 'Picked up',
    'st.Delivered': 'Delivered',
    'st.Failed': 'Failed',
    'st.Cancelled': 'Cancelled',
  },
  'ar': {
    'signIn': 'دخول',
    'invalidCreds': 'التليفون أو الرقم السري غلط',
    'noOrders': 'مفيش طلبات دلوقتي',
    'driverSignIn': 'دخول السواق',
    'phone': 'رقم التليفون',
    'pin': 'الرقم السري',
    'startShift': 'ابدأ الوردية',
    'endShift': 'إنهاء الوردية',
    'locationOn': 'مشاركة الموقع شغّالة',
    'myOrders': 'طلباتي',
    'myCash': 'فلوسي',
    'cashInHand': 'الكاش اللي معايا (عهدة للكاشير)',
    'deliveriesToday': '{n} طلبات النهاردة',
    'collectedToday': 'اتحصّل النهاردة',
    'handedOver': 'اتسلّم للكاشير',
    'todaysDeliveries': 'طلبات النهاردة',
    'carrying': 'لسه معايا',
    'handedOverBadge': 'اتسلّم',
    'activeDelivery': 'التوصيلة الحالية',
    'collectFromCustomer': 'حصّل من العميل',
    'navigate': 'افتح جوجل ماب',
    'pickedUp': 'استلمت الطلب',
    'delivered': 'اتسلّم واتحصّل الكاش',
    'status': 'الحالة',
    'prescriptionReq': 'محتاجة روشتة',
    'locationNeeded': 'الموقع مقفول — المحل مش شايفك. فعّل الموقع عشان تبدأ الوردية.',
    'openSettings': 'افتح الإعدادات',
    'couldntDeliver': 'معرفتش أوصّل',
    'whyFailed': 'إيه اللي حصل؟',
    'notHome': 'العميل مش موجود',
    'refused': 'العميل رفض',
    'wrongAddress': 'العنوان غلط / مش موصول',
    'newOrder': 'طلب جديد · {addr}',
    'view': 'افتح',
    'deliveryCode': 'كود الاستلام',
    'wrongCode': 'الكود غلط',
    'couldntOpenMaps': 'مش قادر يفتح الخريطة',
    'actionFailed': 'حصل مشكلة — جرّب تاني',
    'st.Pending': 'مستني',
    'st.Assigned': 'اتظبط',
    'st.PickedUp': 'استلمه',
    'st.Delivered': 'اتسلّم',
    'st.Failed': 'فشل',
    'st.Cancelled': 'اتلغى',
  },
};

/// Translate an order status enum ('Assigned', 'PickedUp', …) for display.
/// Falls back to the raw value for any status without a mapping.
String trStatus(String status) => tr('st.$status') == 'st.$status' ? status : tr('st.$status');

String tr(String key, {Map<String, String>? vars}) {
  var s = _dict[langNotifier.value]?[key] ?? _dict['en']![key] ?? key;
  if (vars != null) vars.forEach((k, v) => s = s.replaceAll('{$k}', v));
  return s;
}
