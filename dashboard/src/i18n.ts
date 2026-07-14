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
  // signup
  createAccount: 'Create account',
  haveAccount: 'Have an account? Sign in',
  newHere: 'New here? Create an account',
  businessName: 'Business name',
  businessTypeQ: 'What kind of business?',
  managerName: 'Your name',
  phoneOptional: 'Business phone (optional)',
  signUp: 'Create business',
  // ramadan
  ramadanOn: 'Ramadan mode on',
  iftarIn: 'Iftar in {time} · get drivers ready 🌙',
  iftarPassed: 'Ramadan Kareem 🌙 · iftar time',
  iftarTimeLabel: 'Iftar time',
  // onboarding
  getStarted: 'Get started',
  step1Driver: 'Add your first driver',
  step2Order: 'Create your first order',
  addDriver: 'Add driver',
  driverName: 'Driver name',
  driverPhone: 'Phone',
  driverPin: 'PIN',
  add: 'Add',
  done: 'Done',
  // analytics
  today: 'Today',
  ordersToday: 'Orders',
  deliveredToday: 'Delivered',
  avgTime: 'Avg time',
  collected: 'Collected',
  outstanding: 'Outstanding',
  minsShort: '{n} min',
  nearest: 'nearest',
  exportCsv: 'Export week (CSV)',
  // plans
  choosePlan: 'Choose your plan',
  planNote: 'Billing is handled via Fawry / wallet — no card needed. Change anytime.',
  currentPlan: 'Current plan',
  choose: 'Choose',
  custom: 'Custom',
  egpMo: 'EGP / mo',
  mostPopular: 'Most popular',
  upToDrivers: 'Up to {n} drivers',
  'plan.Free': 'Free',
  'plan.Starter': 'Starter',
  'plan.Growth': 'Growth',
  'plan.Chain': 'Chain',
  'feat.tracking': 'Live GPS tracking',
  'feat.history7': '7-day history',
  'feat.cashDrawer': 'COD cash drawer',
  'feat.otp': 'Proof-of-delivery (OTP)',
  'feat.trackLinks': 'Customer tracking links',
  'feat.analytics': 'Analytics + CSV reports',
  'feat.routeReplay': 'Route replay (90-day)',
  'feat.ramadan': 'Ramadan mode · priority support',
  'feat.multiBranch': 'Unlimited drivers · multi-branch',
  'feat.whatsapp': 'WhatsApp notifications',
  'feat.manager': 'Account manager',
  // checkout + gating
  payWithFawry: 'Pay with Fawry',
  choosePayment: 'How do you want to pay?',
  m_fawry: 'Fawry',
  m_vodafone: 'Vodafone Cash',
  m_instapay: 'InstaPay',
  payAmount: 'Pay {amount} EGP',
  fawryRef: 'Fawry code',
  sendTo: 'Send to',
  refNote: 'Reference (write in the note)',
  fawryHow: 'Pay {amount} EGP at any Fawry outlet or in the Fawry app using this code, then tap confirm.',
  walletHow: 'Send {amount} EGP to the number/handle above and put the reference in the note, then tap confirm.',
  ivePaid: "I've paid — activate",
  back: 'Back',
  contactSales: 'Contact sales',
  planActivated: 'Plan activated 🎉',
  upgrade: 'Upgrade',
  upgradeToUnlock: 'Upgrade to unlock',
  lockedFeature: 'This is a paid feature on your plan',
  driverLimit: "You've hit your plan's driver limit — upgrade to add more",
  monthly: 'Monthly',
  annual: 'Annual',
  twoMonthsFree: '2 months free',
  perYear: 'EGP / yr',
  billingHistory: 'Billing history',
  receipts: 'Receipts',
  noReceipts: 'No payments yet',
  colDate: 'Date', colPlan: 'Plan', colAmount: 'Amount', colMethod: 'Method', colRef: 'Reference',
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
  // signup
  createAccount: 'إنشاء حساب',
  haveAccount: 'عندك حساب؟ سجّل دخول',
  newHere: 'أول مرة؟ اعمل حساب',
  businessName: 'اسم المحل',
  businessTypeQ: 'نوع النشاط إيه؟',
  managerName: 'اسمك',
  phoneOptional: 'تليفون المحل (اختياري)',
  signUp: 'إنشاء المحل',
  // ramadan
  ramadanOn: 'وضع رمضان شغّال',
  iftarIn: 'فاضل على الفطار {time} · جهّز السواقين 🌙',
  iftarPassed: 'رمضان كريم 🌙 · وقت الفطار',
  iftarTimeLabel: 'موعد الفطار',
  // onboarding
  getStarted: 'يلا نبدأ',
  step1Driver: 'ضيف أول سواق',
  step2Order: 'اعمل أول طلب',
  addDriver: 'إضافة سواق',
  driverName: 'اسم السواق',
  driverPhone: 'التليفون',
  driverPin: 'الرقم السري',
  add: 'إضافة',
  done: 'تمام',
  // analytics
  today: 'النهاردة',
  ordersToday: 'الطلبات',
  deliveredToday: 'اتسلّم',
  avgTime: 'متوسط الوقت',
  collected: 'المُحصّل',
  outstanding: 'المتبقّي',
  minsShort: '{n} د',
  nearest: 'الأقرب',
  exportCsv: 'تصدير الأسبوع (CSV)',
  // plans
  choosePlan: 'اختار باقتك',
  planNote: 'الدفع عن طريق فوري / المحفظة — من غير كارت. تقدر تغيّر في أي وقت.',
  currentPlan: 'باقتك الحالية',
  choose: 'اختار',
  custom: 'حسب الطلب',
  egpMo: 'جنيه / شهر',
  mostPopular: 'الأكثر اختياراً',
  upToDrivers: 'لحد {n} سواقين',
  'plan.Free': 'مجاني',
  'plan.Starter': 'المحل',
  'plan.Growth': 'الأسطول',
  'plan.Chain': 'السلسلة',
  'feat.tracking': 'تتبع مباشر بالـGPS',
  'feat.history7': 'سجل 7 أيام',
  'feat.cashDrawer': 'درج الكاش (COD)',
  'feat.otp': 'إثبات التسليم (كود)',
  'feat.trackLinks': 'روابط تتبع للعملاء',
  'feat.analytics': 'تحليلات + تقارير CSV',
  'feat.routeReplay': 'إعادة المسار (90 يوم)',
  'feat.ramadan': 'وضع رمضان · دعم أولوية',
  'feat.multiBranch': 'سواقين بلا حد · فروع متعددة',
  'feat.whatsapp': 'إشعارات واتساب',
  'feat.manager': 'مدير حساب',
  // checkout + gating
  payWithFawry: 'ادفع بفوري',
  choosePayment: 'هتدفع إزاي؟',
  m_fawry: 'فوري',
  m_vodafone: 'فودافون كاش',
  m_instapay: 'إنستاباي',
  payAmount: 'ادفع {amount} جنيه',
  fawryRef: 'كود فوري',
  sendTo: 'ابعت لـ',
  refNote: 'الكود المرجعي (اكتبه في الملاحظة)',
  fawryHow: 'ادفع {amount} جنيه من أي منفذ فوري أو من تطبيق فوري بالكود ده، وبعدين اضغط تأكيد.',
  walletHow: 'ابعت {amount} جنيه للرقم/العنوان اللي فوق واكتب الكود المرجعي في الملاحظة، وبعدين اضغط تأكيد.',
  ivePaid: 'دفعت — فعّل الباقة',
  back: 'رجوع',
  contactSales: 'كلّم المبيعات',
  planActivated: 'اتفعّلت الباقة 🎉',
  upgrade: 'ترقية',
  upgradeToUnlock: 'رقّي باقتك عشان تفتحها',
  lockedFeature: 'الميزة دي مدفوعة في باقتك',
  driverLimit: 'وصلت للحد الأقصى للسواقين في باقتك — رقّي عشان تضيف أكتر',
  monthly: 'شهري',
  annual: 'سنوي',
  twoMonthsFree: 'شهرين مجاناً',
  perYear: 'جنيه / سنة',
  billingHistory: 'سجل الفواتير',
  receipts: 'الإيصالات',
  noReceipts: 'لسه مفيش مدفوعات',
  colDate: 'التاريخ', colPlan: 'الباقة', colAmount: 'المبلغ', colMethod: 'الطريقة', colRef: 'الكود المرجعي',
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
