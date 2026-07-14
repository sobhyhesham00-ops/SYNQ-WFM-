// "Find a Captain" directory — discover independent captains who opted in as
// available for hire, and contact them directly (call / WhatsApp). Pure
// discovery: no assignment, no money, no commission handled here.
import { useState } from 'react';
import { api, type Captain } from './api';
import { useLang } from './i18n';

const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const waLink = (phone: string, text: string) =>
  `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;

export function FindCaptain({ token, onAdded }: { token: string; onAdded: () => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captains, setCaptains] = useState<Captain[] | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && captains === null) {
      setLoading(true);
      try { setCaptains(await api.availableCaptains(token)); }
      finally { setLoading(false); }
    }
  }

  async function addToFleet(c: Captain) {
    const pin = c.phone.slice(-4) || '1234';
    try {
      await api.addDriver(token, { name: c.name, phone: c.phone, password: pin });
      alert(t('addedToFleet', { name: c.name, pin }));
      onAdded();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="card find-captain">
      <button className="find-head" onClick={toggle}>
        <span>🧢 {t('findCaptain')}</span>
        <span className="chev">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div className="subtle" style={{ marginBottom: 4 }}>{t('findCaptainSub')}</div>
          {loading && <div className="subtle" style={{ padding: 12, textAlign: 'center' }}>…</div>}
          {captains && captains.length === 0 && (
            <div className="subtle" style={{ padding: 12, textAlign: 'center' }}>{t('noCaptains')}</div>
          )}
          {captains?.map((c) => (
            <div className="captain-row" key={c.id}>
              <div className="avatar">{initials(c.name)}</div>
              <div className="grow">
                <div className="name">
                  {c.name}
                  {c.rating != null && <span className="rating-badge">⭐ {c.rating.toFixed(1)}</span>}
                  <span className={`dot-status ${c.online ? 'on' : ''}`} title={c.online ? t('online') : t('offline')} />
                </div>
                <div className="subtle">
                  {c.vehicle ? `${c.vehicle} · ` : ''}{c.city ?? ''}
                  {c.distanceKm != null ? ` · ${t('kmAway', { n: c.distanceKm })}` : ''}
                </div>
                <div className="row" style={{ gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  <a className="link-btn" href={`tel:${c.phone}`}>📞 {c.phone}</a>
                  <a className="link-btn" target="_blank" rel="noreferrer"
                     href={waLink(c.phone, 'السلام عليكم، عايز أطلب توصيلة عن طريق الكابتن')}>🟢 WhatsApp</a>
                  <button className="link-btn" onClick={() => addToFleet(c)}>➕ {t('addToFleet')}</button>
                </div>
              </div>
            </div>
          ))}
          <div className="subtle" style={{ fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>{t('contactNote')}</div>
        </div>
      )}
    </div>
  );
}
