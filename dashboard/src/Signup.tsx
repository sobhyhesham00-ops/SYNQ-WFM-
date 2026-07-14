import { useState } from 'react';
import { api, BUSINESS_TYPES, type BusinessType } from './api';
import { useLang } from './i18n';

const ICON: Record<BusinessType, string> = {
  Restaurant: '🍽️', Takeaway: '🥡', Pharmacy: '💊',
  Grocery: '🛒', Minimarket: '🏪', Kiosk: '🥤', Other: '🏬',
};

export function Signup({ onLogin, onSwitch }: {
  onLogin: (token: string, name: string) => void;
  onSwitch: () => void;
}) {
  const { t, lang, setLang } = useLang();
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Restaurant');
  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    try {
      const { token, name } = await api.register({ businessName, businessType, phone, managerName, email, password });
      onLogin(token, name);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card" style={{ width: 380 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}><span className="brand-dot" /> El Kaptin <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 700 }}>الكابتن</span></h2>
          <button className="ghost-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>
        <div className="subtle">{t('createAccount')}</div>

        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder={t('businessName')} />

        <div className="subtle" style={{ marginTop: 2 }}>{t('businessTypeQ')}</div>
        <div className="type-grid">
          {BUSINESS_TYPES.map((bt) => (
            <button key={bt} type="button"
              className={`type-chip ${businessType === bt ? 'on' : ''}`}
              onClick={() => setBusinessType(bt)}>
              <span style={{ fontSize: 20 }}>{ICON[bt]}</span>
              <span>{t(`biz.${bt}`)}</span>
            </button>
          ))}
        </div>

        <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder={t('managerName')} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phoneOptional')} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email')} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('password')} />

        {err && <div className="err">{err}</div>}
        <button className="pill-btn" disabled={busy} onClick={submit}>{t('signUp')}</button>
        <button className="link-btn" style={{ textAlign: 'center' }} onClick={onSwitch}>{t('haveAccount')}</button>
      </div>
    </div>
  );
}
