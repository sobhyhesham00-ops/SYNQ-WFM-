// Subscription plans + monthly/annual toggle + multi-wallet checkout stub
// (Fawry / Vodafone Cash / InstaPay) + billing history. No real PSP wired —
// money moves through the licensed wallet; El Kaptin never holds a balance.
import { useEffect, useState, type ReactNode } from 'react';
import { api, type PlanTier } from './api';
import { useLang } from './i18n';

interface Tier { id: PlanTier; monthly: number; drivers: string; badge?: string; features: string[]; }
type Method = 'fawry' | 'vodafone' | 'instapay';
type Cycle = 'monthly' | 'annual';
interface Pay { plan: PlanTier; method: Method; cycle: Cycle; amountEGP: string; reference: string; payTo: string | null; }
type Receipt = { id: string; plan: string; method: string; cycle: string; amountEGP: string; reference: string; date: string };

const METHODS: { id: Method; icon: string }[] = [
  { id: 'fawry', icon: '🟡' }, { id: 'vodafone', icon: '🔴' }, { id: 'instapay', icon: '🟣' },
];

export function Plans({ token, current, onClose, onChange }: {
  token: string; current: PlanTier; onClose: () => void; onChange: () => void;
}) {
  const { t } = useLang();
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [picking, setPicking] = useState<PlanTier | null>(null);
  const [pay, setPay] = useState<Pay | null>(null);
  const [view, setView] = useState<'plans' | 'receipts'>('plans');
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (view === 'receipts' && receipts === null) api.billingHistory(token).then(setReceipts).catch(() => setReceipts([])); }, [view]);

  const tiers: Tier[] = [
    { id: 'Free', monthly: 0, drivers: '1', features: [t('feat.tracking'), t('feat.history7')] },
    { id: 'Starter', monthly: 199, drivers: '3', badge: t('mostPopular'), features: [t('feat.cashDrawer'), t('feat.otp'), t('feat.trackLinks')] },
    { id: 'Growth', monthly: 499, drivers: '10', features: [t('feat.analytics'), t('feat.routeReplay'), t('feat.ramadan')] },
    { id: 'Chain', monthly: -1, drivers: '∞', features: [t('feat.multiBranch'), t('feat.whatsapp'), t('feat.manager')] },
  ];

  const priceOf = (m: number) => cycle === 'annual' ? (m * 10).toLocaleString('en-EG') : String(m);

  async function choosePlan(id: PlanTier) {
    if (id === 'Free') { setBusy(true); try { await api.checkout(token, 'Free', 'fawry', cycle); onChange(); onClose(); } finally { setBusy(false); } return; }
    if (id === 'Chain') { alert(t('contactSales')); return; }
    setPicking(id);
  }
  async function pickMethod(method: Method) {
    if (!picking) return;
    setBusy(true);
    try {
      const r = await api.checkout(token, picking, method, cycle);
      setPay({ plan: picking, method, cycle, amountEGP: r.amountEGP!, reference: r.reference!, payTo: r.payTo ?? null });
      setPicking(null);
    } finally { setBusy(false); }
  }
  async function confirmPaid() {
    if (!pay) return;
    setBusy(true);
    try { await api.confirmPayment(token, { plan: pay.plan, method: pay.method, cycle: pay.cycle, reference: pay.reference }); alert(t('planActivated')); onChange(); onClose(); }
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

  if (pay) return shell(t(`m_${pay.method}`), (
    <>
      <div className="fawry-box">
        {pay.method === 'fawry'
          ? <><div className="subtle">{t('fawryRef')}</div><div className="fawry-code">{pay.reference}</div></>
          : <><div className="subtle">{t('sendTo')}</div><div className="fawry-code" style={{ fontSize: 22, letterSpacing: 1 }}>{pay.payTo}</div>
              <div className="subtle" style={{ marginTop: 8 }}>{t('refNote')}: <b>{pay.reference}</b></div></>}
        <div className="fawry-amount">{pay.amountEGP} EGP</div>
      </div>
      <p className="subtle" style={{ fontSize: 13 }}>{pay.method === 'fawry' ? t('fawryHow', { amount: pay.amountEGP }) : t('walletHow', { amount: pay.amountEGP })}</p>
      <button className="pill-btn" disabled={busy} onClick={confirmPaid} style={{ width: '100%' }}>{t('ivePaid')}</button>
      <button className="link-btn" style={{ textAlign: 'center', marginTop: 8 }} onClick={() => { setPay(null); setPicking(pay.plan); }}>{t('back')}</button>
    </>
  ));

  if (picking) return shell(t('choosePayment'), (
    <>
      <div className="method-grid">
        {METHODS.map((m) => (
          <button key={m.id} className="method-btn" disabled={busy} onClick={() => pickMethod(m.id)}>
            <span style={{ fontSize: 26 }}>{m.icon}</span><span>{t(`m_${m.id}`)}</span>
          </button>
        ))}
      </div>
      <button className="link-btn" style={{ textAlign: 'center', marginTop: 12, width: '100%' }} onClick={() => setPicking(null)}>{t('back')}</button>
    </>
  ), '440px');

  if (view === 'receipts') return shell(t('billingHistory'), (
    <>
      {!receipts ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>…</div>
        : receipts.length === 0 ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>{t('noReceipts')}</div>
        : <div style={{ overflowX: 'auto' }}>
            <table className="receipts">
              <thead><tr><th>{t('colDate')}</th><th>{t('colPlan')}</th><th>{t('colMethod')}</th><th>{t('colAmount')}</th><th>{t('colRef')}</th></tr></thead>
              <tbody>{receipts.map((r) => (
                <tr key={r.id}><td className="num">{r.date}</td><td>{t(`plan.${r.plan}`)} · {t(r.cycle)}</td>
                  <td>{t(`m_${r.method}`)}</td><td className="num"><b>{r.amountEGP}</b></td><td className="num subtle">{r.reference}</td></tr>
              ))}</tbody>
            </table>
          </div>}
      <button className="link-btn" style={{ textAlign: 'center', marginTop: 12, width: '100%' }} onClick={() => setView('plans')}>{t('back')}</button>
    </>
  ), '620px');

  // plan grid
  return shell(t('choosePlan'), (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div className="cycle-toggle">
          <button className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>{t('monthly')}</button>
          <button className={cycle === 'annual' ? 'on' : ''} onClick={() => setCycle('annual')}>{t('annual')} · {t('twoMonthsFree')} 🎉</button>
        </div>
        <button className="link-btn" onClick={() => setView('receipts')}>🧾 {t('receipts')}</button>
      </div>
      <div className="plan-grid">
        {tiers.map((tr) => (
          <div key={tr.id} className={`plan-card ${tr.id === current ? 'current' : ''} ${tr.badge ? 'hot' : ''}`}>
            {tr.badge && <span className="plan-badge">{tr.badge}</span>}
            <div className="plan-name">{t(`plan.${tr.id}`)}</div>
            <div className="plan-price">
              {tr.monthly < 0 ? t('custom') : priceOf(tr.monthly)}
              {tr.monthly >= 0 ? <small> {cycle === 'annual' ? t('perYear') : t('egpMo')}</small> : null}
            </div>
            <div className="subtle" style={{ fontSize: 12 }}>{t('upToDrivers', { n: tr.drivers })}</div>
            <ul className="plan-feats">{tr.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <button className={tr.id === current ? 'ghost-pill' : 'pill-btn'} style={{ marginTop: 'auto', width: '100%' }}
              disabled={tr.id === current || busy} onClick={() => choosePlan(tr.id)}>
              {tr.id === current ? t('currentPlan') : t('choose')}
            </button>
          </div>
        ))}
      </div>
    </>
  ), '860px');
}
