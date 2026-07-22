import { useEffect, useMemo, useRef, useState } from 'react';
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
import { OrderHistory } from './OrderHistory';
import { AttentionQueue } from './AttentionQueue';
import { RevenueChart } from './RevenueChart';
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
  const [showHistory, setShowHistory] = useState(false);
  const [showAttention, setShowAttention] = useState(false);
  const [attentionCount, setAttentionCount] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; kind: 'error' | 'warn' | 'info' | 'ok'; text: string }[]>([]);
  const pushToast = (kind: 'error' | 'warn' | 'info' | 'ok', text: string) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, kind, text }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 6000);
  };

  // Live WS events → toast on a failed delivery, and keep the board + attention
  // badge fresh whenever any order/driver/cash event lands.
  const { pins, drawers } = useTracking(WS_BASE, token ?? '', (msg) => {
    const type = msg.type as string | undefined;
    const order = msg.order as { status?: string; customerAddress?: string } | undefined;
    if (type === 'order_status' && order?.status === 'Failed') {
      pushToast('error', t('failedToast', { addr: order.customerAddress ?? '' }));
    }
    if (type?.startsWith('order_') || type === 'cash_settled' || type === 'driver_updated' || type === 'driver_added') {
      refresh();
      if (token) api.attention(token).then((d) => setAttentionCount(d.count)).catch(() => {});
    }
  });

  // Order idle drivers by proximity to the shop (nearest first) for assignment.
  function driversByProximity() {
    const shop = business?.shopLat != null && business?.shopLng != null
      ? { lat: business.shopLat, lng: business.shopLng } : null;
    const idle = drivers.filter((d) => d.status !== 'Offline' && d.active !== false);
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

  // Keep the header "needs attention" badge current.
  useEffect(() => {
    if (!token) return;
    api.attention(token).then((d) => setAttentionCount(d.count)).catch(() => {});
  }, [token, refreshKey]);

  // Staleness is time-based (no WS event fires when an order crosses the "waiting
  // too long" threshold), so poll the attention queue and toast newly-stale ones.
  const alertedStale = useRef<Set<string>>(new Set());
  const firstAttentionPoll = useRef(true);
  useEffect(() => {
    if (!token) return;
    let live = true;
    const poll = async () => {
      try {
        const d = await api.attention(token);
        if (!live) return;
        setAttentionCount(d.count);
        const stale = [...d.stalePending, ...d.staleAssigned];
        if (firstAttentionPoll.current) {
          // On first load, seed the set and show one summary toast (not a storm).
          firstAttentionPoll.current = false;
          stale.forEach((o) => alertedStale.current.add(o.id));
          if (d.count > 0) pushToast('warn', t('attentionSummary', { n: String(d.count) }));
        } else {
          for (const o of stale) {
            if (!alertedStale.current.has(o.id)) {
              alertedStale.current.add(o.id);
              pushToast('warn', t('staleToast', { addr: o.customerAddress }));
            }
          }
        }
      } catch { /* offline — try again next tick */ }
    };
    poll();
    const iv = setInterval(poll, 60_000);
    return () => { live = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 16, insetInlineEnd: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2000 }}>
          {toasts.map((x) => (
            <div key={x.id} role="status" onClick={() => { setShowAttention(true); }} style={{
              cursor: 'pointer',
              background: x.kind === 'error' ? 'var(--danger)' : x.kind === 'warn' ? '#f0a500' : x.kind === 'ok' ? 'var(--ok)' : 'var(--brand)',
              color: '#fff', padding: '11px 15px', borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,.22)', fontWeight: 600, fontSize: 13, maxWidth: 320,
            }}>{x.text}</div>
          ))}
        </div>
      )}
      {plansModal}
      {showBoard && <Leaderboard token={token!} onClose={() => setShowBoard(false)} />}
      {showSummary && <DailySummary token={token!} onClose={() => setShowSummary(false)} />}
      {showHistory && <OrderHistory token={token!} drivers={drivers} onClose={() => setShowHistory(false)} />}
      {showAttention && <AttentionQueue token={token!} drivers={drivers} onClose={() => setShowAttention(false)} />}
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
            <button className="ghost-btn" title={t('attention')} onClick={() => setShowAttention(true)} style={{ position: 'relative' }}>
              ⚠️{attentionCount > 0 && (
                <span style={{ position: 'absolute', top: -3, insetInlineEnd: -3, background: 'var(--danger)', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, lineHeight: '16px', textAlign: 'center', padding: '0 3px' }}>{attentionCount}</span>
              )}
            </button>
            <button className="ghost-btn" title={t('history')} onClick={() => setShowHistory(true)}>📜</button>
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

        {drivers.length > 0 && orders.length > 0 && can(plan, 'analytics') && (
          <div style={{ marginTop: 12 }}><RevenueChart token={token} /></div>
        )}

        {/* Cash drawer per driver */}
        <div className="section-head">
          <h3>{t('cashDrawer')}</h3>
          <div className="row" style={{ gap: 12 }}>
            <button className="link-btn" onClick={() => gated('csv') && api.exportCashCsv(token)}>
              {can(plan, 'csv') ? '⬇' : '🔒'} {t('exportCsv')}</button>
            <button className="link-btn" onClick={() => gated('csv') && api.exportDriversCsv(token)}>
              {can(plan, 'csv') ? '⬇' : '🔒'} {t('exportDrivers')}</button>
          </div>
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
                {d.active === false
                  ? <span className="chip Offline">{t('inactive')}</span>
                  : <span className={`chip ${d.status}`}>{t(`status.${d.status}`)}</span>}
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
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <button
                  className="ghost-pill"
                  onClick={async () => {
                    const pin = window.prompt(t('newPin'));
                    if (!pin) return;
                    await api.resetDriverPin(token, d.id, pin);
                    alert(t('pinReset'));
                  }}
                >
                  🔑 {t('resetPin')}
                </button>
                <button
                  className="ghost-pill"
                  style={{ color: d.active === false ? 'var(--ok)' : 'var(--danger)' }}
                  onClick={async () => {
                    const activate = d.active === false;
                    if (!activate && !window.confirm(t('deactivateConfirm'))) return;
                    await api.setDriverActive(token, d.id, activate);
                    refresh();
                  }}
                >
                  {d.active === false ? `✓ ${t('reactivate')}` : `⊘ ${t('deactivate')}`}
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
