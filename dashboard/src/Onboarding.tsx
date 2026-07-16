// Empty-state onboarding checklist for a freshly-signed-up merchant, so the
// dashboard isn't a blank page. Two steps: add a driver, create an order.
import { useState } from 'react';
import { api } from './api';
import { useLang } from './i18n';

export function Onboarding({ token, hasDriver, hasOrder, onChange }: {
  token: string; hasDriver: boolean; hasOrder: boolean; onChange: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(!hasDriver);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  async function addDriver() {
    if (!name || !phone || !pin) return;
    setBusy(true);
    try {
      await api.addDriver(token, { name, phone, password: pin });
      setName(''); setPhone(''); setPin(''); setOpen(false);
      onChange();
    } finally { setBusy(false); }
  }

  return (
    <div className="onboard">
      <div className="onboard-head">🚀 {t('getStarted')}</div>

      <div className={`onboard-step ${hasDriver ? 'ok' : ''}`}>
        <span className="onboard-check">{hasDriver ? '✓' : '1'}</span>
        <span className="grow">{t('step1Driver')}</span>
        {!hasDriver && <button className="ghost-pill" onClick={() => setOpen((o) => !o)}>{t('addDriver')}</button>}
      </div>
      {open && !hasDriver && (
        <div className="onboard-form">
          <input className="mini-input" placeholder={t('driverName')} value={name} onChange={(e) => setName(e.target.value)} />
          <input className="mini-input" placeholder={t('driverPhone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="mini-input" style={{ flex: 1 }} placeholder={t('driverPin')} value={pin} onChange={(e) => setPin(e.target.value)} />
            <button className="pill-btn" style={{ width: 'auto', marginTop: 0, padding: '9px 18px' }} disabled={busy} onClick={addDriver}>{t('add')}</button>
          </div>
        </div>
      )}

      <div className={`onboard-step ${hasOrder ? 'ok' : ''}`}>
        <span className="onboard-check">{hasOrder ? '✓' : '2'}</span>
        <span className="grow">{t('step2Order')}</span>
      </div>
    </div>
  );
}
