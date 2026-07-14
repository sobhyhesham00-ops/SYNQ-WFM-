// Owner end-of-day recap — a light summary the owner can read and share on
// WhatsApp (how Egyptian owners actually pass numbers around).
import { useEffect, useState } from 'react';
import { api } from './api';
import { useLang } from './i18n';

type Sum = Awaited<ReturnType<typeof api.dailySummary>>;

export function DailySummary({ token, onClose }: { token: string; onClose: () => void }) {
  const { t } = useLang();
  const [s, setS] = useState<Sum | null>(null);

  useEffect(() => { api.dailySummary(token).then(setS).catch(() => {}); }, []);

  const rows: [string, string][] = s ? [
    [t('sumDeliveries'), String(s.deliveries)],
    [t('sumOpen'), String(s.openOrders)],
    [t('sumCollected'), `${s.collectedEGP} EGP`],
    [t('sumOutstanding'), `${s.outstandingEGP} EGP`],
    [t('sumDrivers'), `${s.activeDrivers}/${s.totalDrivers}`],
  ] : [];

  function asText() {
    if (!s) return '';
    return `🧢 ${s.businessName} — ${t('dailySummary')} (${s.date})\n`
      + rows.map(([k, v]) => `• ${k}: ${v}`).join('\n');
  }
  function share() {
    window.open(`https://wa.me/?text=${encodeURIComponent(asText())}`, '_blank');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(400px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>📋 {t('dailySummary')}</h2>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>
        {!s ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>…</div> : (
          <>
            <div className="subtle" style={{ marginBottom: 12 }}>{s.businessName} · {s.date}</div>
            <div className="summary-list">
              {rows.map(([k, v]) => (
                <div className="summary-row" key={k}><span className="subtle">{k}</span><b className="num">{v}</b></div>
              ))}
            </div>
            <button className="pill-btn" style={{ width: '100%' }} onClick={share}>🟢 {t('shareWhatsapp')}</button>
            <button className="link-btn" style={{ textAlign: 'center', marginTop: 8, width: '100%' }}
              onClick={() => { navigator.clipboard?.writeText(asText()); alert(t('copied')); }}>⧉ {t('copied')}</button>
          </>
        )}
      </div>
    </div>
  );
}
