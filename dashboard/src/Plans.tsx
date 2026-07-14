// In-app subscription plans. Selecting a plan records it (billing is out-of-band
// via Fawry/wallet — no payment is processed here).
import { api, type PlanTier } from './api';
import { useLang } from './i18n';

interface Tier {
  id: PlanTier; price: string; drivers: string; badge?: string; features: string[];
}

export function Plans({ token, current, onClose, onChange }: {
  token: string; current: PlanTier; onClose: () => void; onChange: () => void;
}) {
  const { t } = useLang();

  const tiers: Tier[] = [
    { id: 'Free', price: '0', drivers: '1', features: [t('feat.tracking'), t('feat.history7')] },
    { id: 'Starter', price: '199', drivers: '3', badge: t('mostPopular'),
      features: [t('feat.cashDrawer'), t('feat.otp'), t('feat.trackLinks')] },
    { id: 'Growth', price: '499', drivers: '10',
      features: [t('feat.analytics'), t('feat.routeReplay'), t('feat.ramadan')] },
    { id: 'Chain', price: t('custom'), drivers: '∞',
      features: [t('feat.multiBranch'), t('feat.whatsapp'), t('feat.manager')] },
  ];

  async function choose(id: PlanTier) {
    await api.updateBusiness(token, { plan: id });
    onChange();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>{t('choosePlan')}</h2>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>
        <div className="subtle" style={{ marginBottom: 14 }}>{t('planNote')}</div>
        <div className="plan-grid">
          {tiers.map((tr) => (
            <div key={tr.id} className={`plan-card ${tr.id === current ? 'current' : ''} ${tr.badge ? 'hot' : ''}`}>
              {tr.badge && <span className="plan-badge">{tr.badge}</span>}
              <div className="plan-name">{t(`plan.${tr.id}`)}</div>
              <div className="plan-price">{tr.price}{tr.price !== t('custom') ? <small> {t('egpMo')}</small> : null}</div>
              <div className="subtle" style={{ fontSize: 12 }}>{t('upToDrivers', { n: tr.drivers })}</div>
              <ul className="plan-feats">{tr.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <button
                className={tr.id === current ? 'ghost-pill' : 'pill-btn'}
                style={{ marginTop: 'auto', width: '100%' }}
                disabled={tr.id === current}
                onClick={() => choose(tr.id)}
              >
                {tr.id === current ? t('currentPlan') : t('choose')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
