// Business settings. Right now: the shop location, which the proximity-based
// driver assignment (🎯 nearest) depends on — a fresh merchant must set it or
// that feature can't rank anyone.
import { useState } from 'react';
import { api, type Business } from './api';
import { useLang } from './i18n';

function ProfileCard({ token, business, onSaved }: {
  token: string; business: Business; onSaved: (b: Partial<Business>) => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const dirty = name.trim() !== business.name || (phone || '') !== (business.phone ?? '');

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true); setOk(false);
    try {
      const b = await api.updateBusiness(token, { name: name.trim(), phone });
      onSaved(b);
      setOk(true); setTimeout(() => setOk(false), 2000);
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🏪 {t('businessProfile')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input className="mini-input" placeholder={t('businessName')} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="mini-input" placeholder={t('businessPhone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="pill-btn" disabled={busy || !dirty || !name.trim()} onClick={save}>{t('save')}</button>
          {ok && <span className="subtle" style={{ color: 'var(--ok)' }}>✓ {t('saved')}</span>}
        </div>
      </div>
    </div>
  );
}

export function Settings({ token, business, onClose, onSaved }: {
  token: string;
  business: Business;
  onClose: () => void;
  onSaved: (b: Partial<Business>) => void;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasLoc = business.shopLat != null && business.shopLng != null;

  async function save(patch: { shopLat?: number | null; shopLng?: number | null }) {
    setBusy(true); setError('');
    try {
      const b = await api.updateBusiness(token, patch);
      onSaved(b);
    } catch {
      setError(t('geoDenied'));
    } finally {
      setBusy(false);
    }
  }

  function useCurrent() {
    if (!('geolocation' in navigator)) { setError(t('geoUnavailable')); return; }
    setBusy(true); setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => save({ shopLat: pos.coords.latitude, shopLng: pos.coords.longitude }),
      () => { setBusy(false); setError(t('geoDenied')); },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(420px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>⚙️ {t('settings')}</h2>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>

        <ProfileCard token={token} business={business} onSaved={onSaved} />

        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14 }}>📍 {t('shopLocation')}</div>
          <div className="subtle" style={{ fontSize: 12, margin: '2px 0 10px' }}>{t('shopLocationHint')}</div>
          <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>
            {hasLoc ? `${business.shopLat!.toFixed(5)}, ${business.shopLng!.toFixed(5)}` : t('locationNotSet')}
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <button className="pill-btn" disabled={busy} onClick={useCurrent}>📍 {t('useCurrentLocation')}</button>
            {hasLoc && (
              <button className="link-btn" disabled={busy} onClick={() => save({ shopLat: null, shopLng: null })}>
                {t('clearLocation')}
              </button>
            )}
          </div>
          {error && <div className="err" style={{ marginTop: 10 }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
