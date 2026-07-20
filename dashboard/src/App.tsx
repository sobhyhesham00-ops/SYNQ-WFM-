import { useEffect, useMemo, useState } from 'react';
import { api, egp, WS_BASE, API_BASE, type Driver, type Order, type Business } from './api';
import { LiveMap } from './LiveMap';
import { useTracking } from './useTracking';
import { Login } from './Login';
import { Signup } from './Signup';
import { RamadanBanner } from './RamadanBanner';
import { Onboarding } from './Onboarding';
import { Analytics } from './Analytics';
import { Plans } from './Plans';
import { Leaderboard } from './Leaderboard';
import { DailySummary } from './DailySummary';
import { can, type Feature } from './plans';
import { useLang } from './i18n';

const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Haversine distance in km — used to suggest the nearest idle driver to the shop.
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export default function App() {
  const { t, lang, setLang } = useLang();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('meshwar_token'));
  const [name, setName] = useState(() => localStorage.getItem('meshwar_name') ?? '');
  const [business, setBusiness] = useState<Business | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [route, setRoute] = useState<{ lat: number; lng: number }[] | null>(null);
  const [replayDriver, setReplayDriver] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPlans, setShowPlans] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const { pins, drawers } = useTracking(WS_BASE, token ?? '');

  // Order idle drivers by proximity to the shop (nearest first) for assignment.
  function driversByProximity() {
    const shop = business?.shopLat != null && business?.shopLng != null
      ? { lat: business.shopLat, lng: business.shopLng } : null;
    const idle = drivers.filter((d) => d.status !== 'Offline');
    if (!shop) return idle.map((d) => ({ d, km: null as number | null }));
    return idle
      .map((d) => ({
        d,
        km: d.currentLat != null && d.currentLng != null
          ? distanceKm(shop, { lat: d.currentLat, lng: d.currentLng }) : null,
      }))
      .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
  }

  async function toggleRamadan() {
    if (!business) return;
    const next = !business.ramadanMode;
    if (next && !gated('ramadan')) return; // enabling requires the Growth plan
    const b = await api.updateBusiness(token!, {
      ramadanMode: next,
      iftarTime: business.iftarTime || '18:05',
    });
    setBusiness((prev) => (prev ? { ...prev, ...b } : b));
  }

  async function toggleReplay(driverId: string) {
    if (replayDriver === driverId) { setRoute(null); setReplayDriver(null); return; }
    if (!gated('routeReplay')) return;
    const { points } = await api.route(token!, driverId);
    setRoute(points.map((p) => ({ lat: p.lat, lng: p.lng })));
    setReplayDriver(driverId);
  }

  const refresh = () => {
    if (!token) return;
    return api.state(token).then((s) => {
      setBusiness(s.business); setDrivers(s.drivers); setOrders(s.orders);
      setRefreshKey((k) => k + 1);
    });
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [token]);

  function onLogin(tok: string, n: string) {
    localStorage.setItem('meshwar_token', tok);
    localStorage.setItem('meshwar_name', n);
    setToken(tok); setName(n);
  }
  function logout() { localStorage.removeItem('meshwar_token'); localStorage.removeItem('meshwar_name'); localStorage.removeItem('meshwar_refresh'); setToken(null); }

  const grandTotalPiastres = useMemo(() => {
    let sum = 0;
    for (const d of drivers) {
      const drawer = drawers[d.id];
      if (drawer) sum += Math.round(parseFloat(drawer.totalEGP.replace(/,/g, '')) * 100);
    }
    if (sum === 0) {
      for (const o of orders)
        if (o.status === 'Delivered' && !o.settled) sum += o.totalCashToCollect;
    }
    return sum;
  }, [drivers, drawers, orders]);

  const activeCount = drivers.filter((d) => d.status !== 'Offline').length;
  const isPharmacy = business?.businessType === 'Pharmacy';
  const plan = business?.plan ?? 'Free';
  // Returns true if the plan allows the feature; otherwise opens the upgrade modal.
  const gated = (f: Feature) => { if (can(plan, f)) return true; setShowPlans(true); return false; };

  const plansModal = showPlans && business ? (
    <Plans token={token!} current={business.plan ?? 'Free'} onClose={() => setShowPlans(false)} onChange={refresh} />
  ) : null;

  if (!token) {
    return authView === 'signup'
      ? <Signup onLogin={onLogin} onSwitch={() => setAuthView('login')} />
      : <Login onLogin={onLogin} onSwitch={() => setAuthView('signup')} />;
  }

  return (
    <div className="app">
      {plansModal}
      {showBoard && <Leaderboard token={token!} onClose={() => setShowBoard(false)} />}
      {showSummary && <DailySummary token={token!} onClose={() => setShowSummary(false)} />}
      <div className="map-pane">
        <LiveMap drivers={drivers} livePins={pins} route={route} />
        {replayDriver && (
          <button className="replay-banner" onClick={() => { setRoute(null); setReplayDriver(null); }}>
            ▶ {t('replaying', { name: drivers.find((d) => d.id === replayDriver)?.name ?? '' })}
          </button>
        )}
      </div>

      <aside className="sidebar">
        <div className="brandbar">
          <div className="brand">
            <span className="brand-dot" /> El Kaptin <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700 }}>الكابتن</span>
            {business && <span className="biz-badge">{t(`biz.${business.businessType}`)}</span>}
            {business && (
              <button className="plan-chip" onClick={() => setShowPlans(true)} title={t('choosePlan')}>
                ⭐ {t(`plan.${business.plan ?? 'Free'}`)}
              </button>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="ghost-btn" title={t('dailySummary')} onClick={() => setShowSummary(true)}>📋</button>
            <button className="ghost-btn" title={t('leaderboard')} onClick={() => { if (gated('analytics')) setShowBoard(true); }}>🏆</button>
            <button className={`ghost-btn ${business?.ramadanMode ? 'moon-on' : ''}`} title="Ramadan mode" onClick={toggleRamadan}>🌙</button>
            <button className="ghost-btn" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <button className="ghost-btn" onClick={logout}>{name || t('logout')} ⏻</button>
          </div>
        </div>

        {business?.ramadanMode && <RamadanBanner iftarTime={business.iftarTime ?? '18:05'} />}

        {/* Hero: fleet cash to collect */}
        <div className="hero">
          <div className="hero-label">{t('cashToCollect')}</div>
          <div className="hero-amount">{egp(grandTotalPiastres)}</div>
          <div className="hero-sub">{t('driversOnShift', { n: activeCount })}</div>
          <div className="hero-chips">
            <button className="hero-chip">🛵 {t('driversCount', { n: drivers.length })}</button>
            <button className="hero-chip">📦 {t('openOrders', { n: orders.filter((o) => o.status !== 'Delivered').length })}</button>
          </div>
        </div>

        {/* Onboarding checklist for a fresh business, else today's analytics */}
        {(drivers.length === 0 || orders.length === 0)
          ? <Onboarding token={token} hasDriver={drivers.length > 0} hasOrder={orders.length > 0} onChange={refresh} />
          : can(plan, 'analytics')
            ? <Analytics token={token} refreshKey={refreshKey} />
            : <button className="locked-card" onClick={() => setShowPlans(true)}>📊 {t('today')} · {t('upgradeToUnlock')} ⭐</button>}

        {/* Cash drawer per driver */}
        <div className="section-head">
          <h3>{t('cashDrawer')}</h3>
          <button className="link-btn" onClick={() => gated('csv') && api.exportCashCsv(token)}>
            {can(plan, 'csv') ? '⬇' : '🔒'} {t('exportCsv')}</button>
        </div>
        {drivers.map((d) => {
          const drawer = drawers[d.id];
          const seedOwed = orders
            .filter((o) => o.driverId === d.id && o.status === 'Delivered' && !o.settled)
            .reduce((s, o) => s + o.totalCashToCollect, 0);
          const owedEGP = drawer ? drawer.totalEGP + ' EGP' : seedOwed ? egp(seedOwed) : null;
          return (
            <div className="card" key={d.id}>
              <div className="row">
                <div className="avatar">{initials(d.name)}</div>
                <div className="grow">
                  <div className="name">{d.name}
                    {d.rating != null && (
                      <span className="rating-badge">⭐ {d.rating.toFixed(1)}{d.ratingCount ? ` (${d.ratingCount})` : ''}</span>
                    )}
                  </div>
                  <div className="subtle">{d.phone}</div>
                </div>
                <span className={`chip ${d.status}`}>{t(`status.${d.status}`)}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <div className="grow subtle">{t('owesCashier')}</div>
                <div className="amount">{owedEGP ?? '—'}</div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button
                  className="pill-btn"
                  disabled={!owedEGP}
                  onClick={async () => {
                    if (!gated('cashDrawer')) return;
                    const r = await api.settle(token, d.id);
                    alert(t('collectedFrom', { amount: r.settledEGP + ' EGP', name: d.name, count: r.orderCount }));
                    refresh();
                  }}
                >
                  {can(plan, 'cashDrawer') ? t('receivedCash') : `🔒 ${t('receivedCash')}`}
                </button>
                <button
                  className={`ghost-pill ${replayDriver === d.id ? 'on' : ''}`}
                  onClick={() => toggleReplay(d.id)}
                >
                  {replayDriver === d.id ? `■ ${t('stop')}` : `▶ ${t('route')}`}
                </button>
              </div>
            </div>
          );
        })}

        {/* Orders */}
        <div className="section-head"><h3>{t('orders')}</h3></div>
        <NewOrder isPharmacy={isPharmacy}
          onCreate={(o) => api.createOrder(token, o).then(refresh)} />
        <div className="card" style={{ padding: '4px 12px' }}>
          {orders.map((o) => (
            <div className="order" key={o.id}>
              <div className="grow">
                {editingId === o.id ? (
                  <OrderEditor
                    order={o}
                    isPharmacy={isPharmacy}
                    onCancel={() => setEditingId(null)}
                    onSave={(patch) => api.editOrder(token, o.id, patch).then(() => { setEditingId(null); refresh(); })}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {o.customerAddress}
                      {o.requiresPrescription && <span className="rx" title={t('prescriptionReq')}>℞</span>}
                    </div>
                    {o.landmark && <div className="subtle">📍 {o.landmark}</div>}
                    <div className="subtle">{egp(o.totalCashToCollect)}</div>
                    <div className="row" style={{ gap: 10, marginTop: 4 }}>
                      {o.customerPhone && (
                        <a className="link-btn" href={`tel:${o.customerPhone}`}>📞 {t('call')}</a>
                      )}
                      {(o.status === 'Assigned' || o.status === 'PickedUp') && (
                        <button
                          className="link-btn"
                          onClick={() => {
                            if (!gated('trackLinks')) return;
                            const url = `${API_BASE}/t/${o.publicToken}`;
                            navigator.clipboard?.writeText(url);
                            alert(t('linkCopied', { url }));
                          }}
                        >
                          {can(plan, 'trackLinks') ? '🔗' : '🔒'} {t('shareTracking')}
                        </button>
                      )}
                      {o.status !== 'Delivered' && o.status !== 'Cancelled' && (
                        <button className="link-btn" onClick={() => setEditingId(o.id)}>✎ {t('edit')}</button>
                      )}
                      {o.status !== 'Delivered' && o.status !== 'Cancelled' && (
                        <button
                          className="link-btn"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => {
                            if (!window.confirm(t('cancelConfirm'))) return;
                            api.cancelOrder(token, o.id).then(refresh);
                          }}
                        >
                          ✕ {t('cancelOrder')}
                        </button>
                      )}
                    </div>
                    {o.status !== 'Delivered' && o.status !== 'Cancelled' && (
                      <select
                        className="select"
                        defaultValue=""
                        onChange={(e) => e.target.value && api.assign(token, o.id, e.target.value).then(refresh)}
                      >
                        <option value="" disabled>{o.status === 'Pending' ? t('assignTo') : t('reassignTo')}</option>
                        {driversByProximity().map(({ d, km }, i) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                            {km != null ? ` · ${km.toFixed(1)} km` : ''}
                            {i === 0 && km != null ? ` · 🎯 ${t('nearest')}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </>
                )}
              </div>
              <span className="subtle" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span
                  className="status-dot"
                  style={{ background: o.status === 'Delivered' ? 'var(--ok)' : o.status === 'Failed' ? 'var(--danger)' : o.status === 'Pending' ? '#f0a500' : 'var(--brand)' }}
                />
                {t(`status.${o.status}`)}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function NewOrder({ isPharmacy, onCreate }: {
  isPharmacy: boolean;
  onCreate: (o: { customerAddress: string; totalCashEGP: number; landmark?: string; requiresPrescription?: boolean }) => void;
}) {
  const { t } = useLang();
  const [addr, setAddr] = useState('');
  const [landmark, setLandmark] = useState('');
  const [amt, setAmt] = useState('');
  const [rx, setRx] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input className="mini-input" placeholder={t('customerAddress')}
        value={addr} onChange={(e) => setAddr(e.target.value)} />
      <input className="mini-input" placeholder={t('landmark')}
        value={landmark} onChange={(e) => setLandmark(e.target.value)} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input className="mini-input" style={{ width: 80 }} placeholder="EGP"
          value={amt} onChange={(e) => setAmt(e.target.value)} />
        {isPharmacy && (
          <label className="subtle" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            <input type="checkbox" checked={rx} onChange={(e) => setRx(e.target.checked)} /> {t('prescriptionReq')}
          </label>
        )}
        <button className="add-btn" onClick={() => {
          if (addr && amt) {
            onCreate({ customerAddress: addr, totalCashEGP: Number(amt), landmark: landmark || undefined, requiresPrescription: rx });
            setAddr(''); setLandmark(''); setAmt(''); setRx(false);
          }
        }}>+</button>
      </div>
    </div>
  );
}

function OrderEditor({ order, isPharmacy, onSave, onCancel }: {
  order: Order;
  isPharmacy: boolean;
  onSave: (patch: { customerAddress?: string; landmark?: string; customerPhone?: string; totalCashEGP?: number; requiresPrescription?: boolean }) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [addr, setAddr] = useState(order.customerAddress);
  const [landmark, setLandmark] = useState(order.landmark ?? '');
  const [phone, setPhone] = useState(order.customerPhone ?? '');
  const [amt, setAmt] = useState((order.totalCashToCollect / 100).toString());
  const [rx, setRx] = useState(order.requiresPrescription);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input className="mini-input" placeholder={t('customerAddress')} value={addr} onChange={(e) => setAddr(e.target.value)} />
      <input className="mini-input" placeholder={t('landmark')} value={landmark} onChange={(e) => setLandmark(e.target.value)} />
      <input className="mini-input" placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input className="mini-input" style={{ width: 80 }} placeholder="EGP" value={amt} onChange={(e) => setAmt(e.target.value)} />
        {isPharmacy && (
          <label className="subtle" style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
            <input type="checkbox" checked={rx} onChange={(e) => setRx(e.target.checked)} /> {t('prescriptionReq')}
          </label>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="add-btn" style={{ flex: 1, width: 'auto' }} onClick={() => {
          if (!addr.trim() || !(Number(amt) >= 0)) return;
          onSave({ customerAddress: addr.trim(), landmark, customerPhone: phone, totalCashEGP: Number(amt), requiresPrescription: rx });
        }}>{t('save')}</button>
        <button className="link-btn" onClick={onCancel}>{t('cancel')}</button>
      </div>
    </div>
  );
}
