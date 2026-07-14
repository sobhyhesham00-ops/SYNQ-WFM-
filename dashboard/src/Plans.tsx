// In-app subscription plans + a multi-wallet checkout stub (Fawry / Vodafone
// Cash / InstaPay). No real PSP wired — money moves through the licensed wallet;
// /confirm simulates the payment webhook. El Kaptin never holds a balance.
import { useState, type ReactNode } from 'react';
import { api, type PlanTier } from './api';
import { useLang } from './i18n';

interface Tier { id: PlanTier; price: string; drivers: string; badge?: string; features: string[]; }
type Method = 'fawry' | 'vodafone' | 'instapay';
interface Pay { plan: PlanTier; method: Method; amountEGP: string; reference: string; payTo: string | null; }

const METHODS: { id: Method; icon: string }[] = [
  { id: 'fawry', icon: '🟡' }, { id: 'vodafone', icon: '🔴' }, { id: 'instapay', icon: '🟣' },
];

export function Plans({ token, current, onClose, onChange }: {
  token: string; current: PlanTier; onClose: () => void; onChange: () => void;
}) {
  const { t } = useLang();
  const [picking, setPicking] = useState<PlanTier | null>(null); // plan chosen, choosing method
  const [pay, setPay] = useState<Pay | null>(null);              // method chosen, showing details
  const [busy, setBusy] = useState(false);

  const tiers: Tier[] = [
    { id: 'Free', price: '0', drivers: '1', features: [t('feat.tracking'), t('feat.history7')] },
    { id: 'Starter', price: '199', drivers: '3', badge: t('mostPopular'),
      features: [t('feat.cashDrawer'), t('feat.otp'), t('feat.trackLinks')] },
    { id: 'Growth', price: '499', drivers: '10',
      features: [t('feat.analytics'), t('feat.routeReplay'), t('feat.ramadan')] },
    { id: 'Chain', price: t('custom'), drivers: '∞',
      features: [t('feat.multiBranch'), t('feat.whatsapp'), t('feat.manager')] },
  ];

  async function choosePlan(id: PlanTier) {
    if (id === 'Free') { setBusy(true); try { await api.checkout(token, 'Free', 'fawry'); onChange(); onClose(); } finally { setBusy(false); } return; }
    if (id === 'Chain') { alert(t('contactSales')); return; }
    setPicking(id); // paid → pick a wallet
  }

  async function pickMethod(method: Method) {
    if (!picking) return;
    setBusy(true);
    try {
      const r = await api.checkout(token, picking, method);
      setPay({ plan: picking, method, amountEGP: r.amountEGP!, reference: r.reference!, payTo: r.payTo ?? null });
      setPicking(null);
    } finally { setBusy(false); }
  }

  async function confirmPaid() {
    if (!pay) return;
    setBusy(true);
    try { await api.confirmPayment(token, pay.plan); alert(t('planActivated')); onChange(); onClose(); }
    finally { setBusy(false); }
  }

  const shell = (title: string, body: ReactNode, width = '420px') => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: `min(${width}, 96vw)` }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>
        {body}
      </div>
    </div>
  );

  // ---- Step 3: wallet pay details ----
  if (pay) {
    return shell(t(`m_${pay.method}`), (
      <>
        <div className="fawry-box">
          {pay.method === 'fawry' ? (
            <>
              <div className="subtle">{t('fawryRef')}</div>
              <div className="fawry-code">{pay.reference}</div>
            </>
          ) : (
            <>
              <div className="subtle">{t('sendTo')}</div>
              <div className="fawry-code" style={{ fontSize: 22, letterSpacing: 1 }}>{pay.payTo}</div>
              <div className="subtle" style={{ marginTop: 8 }}>{t('refNote')}: <b>{pay.reference}</b></div>
            </>
          )}
          <div className="fawry-amount">{pay.amountEGP} EGP</div>
        </div>
        <p className="subtle" style={{ fontSize: 13 }}>
          {pay.method === 'fawry' ? t('fawryHow', { amount: pay.amountEGP }) : t('walletHow', { amount: pay.amountEGP })}
        </p>
        <button className="pill-btn" disabled={busy} onClick={confirmPaid} style={{ width: '100%' }}>{t('ivePaid')}</button>
        <button className="link-btn" style={{ textAlign: 'center', marginTop: 8 }} onClick={() => { setPay(null); setPicking(pay.plan); }}>{t('back')}</button>
      </>
    ));
  }

  // ---- Step 2: choose a wallet ----
  if (picking) {
    return shell(t('choosePayment'), (
      <>
        <div className="method-grid">
          {METHODS.map((m) => (
            <button key={m.id} className="method-btn" disabled={busy} onClick={() => pickMethod(m.id)}>
              <span style={{ fontSize: 26 }}>{m.icon}</span>
              <span>{t(`m_${m.id}`)}</span>
            </button>
          ))}
        </div>
        <button className="link-btn" style={{ textAlign: 'center', marginTop: 12, width: '100%' }} onClick={() => setPicking(null)}>{t('back')}</button>
      </>
    ), '440px');
  }

  // ---- Step 1: plan grid ----
  return shell(t('choosePlan'), (
    <>
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
              disabled={tr.id === current || busy}
              onClick={() => choosePlan(tr.id)}
            >
              {tr.id === current ? t('currentPlan') : t('choose')}
            </button>
          </div>
        ))}
      </div>
    </>
  ), '860px');
}
