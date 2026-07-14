// Lightweight bilingual i18n (English + Egyptian Arabic) with RTL.
// Arabic is a first-class default here (see docs/EGYPT-MARKET.md), not an
// afterthought — copy is colloquial Egyptian, not formal MSA.
import { useSyncExternalStore } from 'react';

export type Lang = 'ar' | 'en';
export type BusinessType = 'Restaurant' | 'Takeaway' | 'Pharmacy';

type Dict = Record<string, string>;

const en: Dict = {
  tagline: 'Manager & cashier dashboard',
  signIn: 'Sign in',
  email: 'Email',
  password: 'Password',
  invalidCreds: 'Invalid credentials',
  logout: 'Logout',
  cashToCollect: 'CASH TO COLLECT FROM FLEET',
  driversOnShift: '{n} drivers on shift · updates live',
  driversCount: '{n} drivers',
  openOrders: '{n} open orders',
  cashDrawer: 'Cash drawer',
  endOfShift: 'End of shift',
  owesCashier: 'Owes cashier',
  receivedCash: 'Received cash',
  route: 'Route',
  stop: 'Stop',
  orders: 'Orders',
  customerAddress: 'Customer address',
  landmark: 'Landmark (e.g. over the pharmacy)',
  prescriptionReq: 'Prescription required',
  assignTo: 'Assign to…',
  shareTracking: 'Share tracking',
  call: 'Call',
  replaying: "Replaying {name}'s route · tap to exit",
  collectedFrom: 'Collected {amount} from {name} ({count} orders)',
  linkCopied: 'Customer tracking link copied:\n{url}',
  'status.Pending': 'Pending',
  'status.Assigned': 'Assigned',
  'status.PickedUp': 'Picked up',
  'status.Delivered': 'Delivered',
  'status.Cancelled': 'Cancelled',
  'status.Idle': 'Idle',
  'status.Delivering': 'Delivering',
  'status.Offline': 'Offline',
  'biz.Restaurant': 'Restaurant',
  'biz.Takeaway': 'Takeaway',
  'biz.Pharmacy': 'Pharmacy',
  'biz.Grocery': 'Grocery',
  'biz.Minimarket': 'Mini-market',
  'biz.Kiosk': 'Kiosk',
  'biz.Other': 'Store',
};

const ar: Dict = {
  tagline: 'لوحة تحكم المدير والكاشير',
  signIn: 'دخول',
  email: 'الإيميل',
  password: 'كلمة السر',
  invalidCreds: 'بيانات الدخول غلط',
  logout: 'خروج',
  cashToCollect: 'الكاش المطلوب تحصيله من السواقين',
  driversOnShift: '{n} سواقين في الوردية · بيتحدّث لحظياً',
  driversCount: '{n} سواقين',
  openOrders: '{n} طلبات مفتوحة',
  cashDrawer: 'درج الكاش',
  endOfShift: 'آخر الوردية',
  owesCashier: 'عليه للكاشير',
  receivedCash: 'استلمت الكاش',
  route: 'المسار',
  stop: 'إيقاف',
  orders: 'الطلبات',
  customerAddress: 'عنوان العميل',
  landmark: 'علامة مميزة (مثلاً فوق الصيدلية)',
  prescriptionReq: 'محتاجة روشتة',
  assignTo: 'اختار سواق…',
  shareTracking: 'ابعت رابط التتبع',
  call: 'اتصال',
  replaying: 'بنعيد مسار {name} · اضغط للخروج',
  collectedFrom: 'استلمت {amount} من {name} ({count} طلبات)',
  linkCopied: 'اتنسخ رابط تتبع العميل:\n{url}',
  'status.Pending': 'في الانتظار',
  'status.Assigned': 'اتوزّع',
  'status.PickedUp': 'استلمه السواق',
  'status.Delivered': 'اتسلّم',
  'status.Cancelled': 'ملغي',
  'status.Idle': 'فاضي',
  'status.Delivering': 'بيوصّل',
  'status.Offline': 'غير متصل',
  'biz.Restaurant': 'مطعم',
  'biz.Takeaway': 'مطعم وجبات',
  'biz.Pharmacy': 'صيدلية',
  'biz.Grocery': 'بقالة',
  'biz.Minimarket': 'سوبر ماركت',
  'biz.Kiosk': 'كشك',
  'biz.Other': 'محل',
};

const dicts: Record<Lang, Dict> = { en, ar };

let lang: Lang = (localStorage.getItem('meshwar_lang') as Lang) || 'ar';
const listeners = new Set<() => void>();

function applyDir() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}
applyDir();

export function setLang(l: Lang) {
  lang = l;
  localStorage.setItem('meshwar_lang', l);
  applyDir();
  listeners.forEach((fn) => fn());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLang() {
  const l = useSyncExternalStore(subscribe, () => lang);
  const t = (key: string, vars?: Record<string, string | number>) => {
    let s = dicts[l][key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  return { lang: l, dir: l === 'ar' ? 'rtl' : ('ltr' as const), t, setLang };
}
