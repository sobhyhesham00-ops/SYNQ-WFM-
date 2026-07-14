import { useState } from 'react';
import { api } from './api';
import { useLang } from './i18n';

export function Login({ onLogin }: { onLogin: (token: string, name: string) => void }) {
  const { t, lang, setLang } = useLang();
  const [email, setEmail] = useState('manager@demo.eg');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');

  async function submit() {
    try {
      const { token, name } = await api.login(email, password);
      onLogin(token, name);
    } catch {
      setErr(t('invalidCreds'));
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}><span className="brand-dot" /> Meshwar <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 700 }}>مشوار</span></h2>
          <button className="ghost-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
        <div className="subtle" style={{ marginBottom: 6 }}>{t('tagline')}</div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email')} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={t('password')} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {err && <div className="err">{err}</div>}
        <button className="pill-btn" onClick={submit}>{t('signIn')}</button>
      </div>
    </div>
  );
}
