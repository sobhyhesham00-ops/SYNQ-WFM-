import { useEffect, useMemo, useState } from 'react';
import { api, egp, WS_BASE, type Driver, type Order } from './api';
import { LiveMap } from './LiveMap';
import { useTracking } from './useTracking';
import { Login } from './Login';

const initials = (name: string) =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('meshwar_token'));
  const [name, setName] = useState(() => localStorage.getItem('meshwar_name') ?? '');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const { pins, drawers } = useTracking(WS_BASE, token ?? '');

  const refresh = () =>
    token && api.state(token).then((s) => { setDrivers(s.drivers); setOrders(s.orders); });

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [token]);

  function onLogin(t: string, n: string) {
    localStorage.setItem('meshwar_token', t);
    localStorage.setItem('meshwar_name', n);
    setToken(t); setName(n);
  }
  function logout() { localStorage.clear(); setToken(null); }

  // Grand total owed across the fleet = sum of live drawer totals (fallback: seed).
  const grandTotalPiastres = useMemo(() => {
    let sum = 0;
    for (const d of drivers) {
      const drawer = drawers[d.id];
      if (drawer) sum += Math.round(parseFloat(drawer.totalEGP.replace(/,/g, '')) * 100);
    }
    // Fallback to seed data (delivered & unsettled) before any WS event arrives.
    if (sum === 0) {
      for (const o of orders)
        if (o.status === 'Delivered' && !o.settled) sum += o.totalCashToCollect;
    }
    return sum;
  }, [drivers, drawers, orders]);

  const activeCount = drivers.filter((d) => d.status !== 'Offline').length;

  if (!token) return <Login onLogin={onLogin} />;

  return (
    <div className="app">
      <div className="map-pane">
        <LiveMap drivers={drivers} livePins={pins} />
      </div>

      <aside className="sidebar">
        <div className="brandbar">
          <div className="brand"><span className="brand-dot" /> Meshwar <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700 }}>مشوار</span></div>
          <button className="ghost-btn" onClick={logout}>{name || 'Logout'} ⏻</button>
        </div>

        {/* Hero: fleet cash to collect at end of shift */}
        <div className="hero">
          <div className="hero-label">CASH TO COLLECT FROM FLEET</div>
          <div className="hero-amount">{egp(grandTotalPiastres)}</div>
          <div className="hero-sub">{activeCount} drivers on shift · refreshed live</div>
          <div className="hero-chips">
            <button className="hero-chip">⛽ {drivers.length} drivers</button>
            <button className="hero-chip">📦 {orders.filter((o) => o.status !== 'Delivered').length} open orders</button>
          </div>
        </div>

        {/* Cash drawer per driver */}
        <div className="section-head"><h3>Cash drawer</h3><a>End of shift</a></div>
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
                  <div className="name">{d.name}</div>
                  <div className="subtle">{d.phone}</div>
                </div>
                <span className={`chip ${d.status}`}>{d.status}</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <div className="grow subtle">Owes cashier</div>
                <div className="amount">{owedEGP ?? '—'}</div>
              </div>
              <button
                className="pill-btn"
                disabled={!owedEGP}
                onClick={async () => {
                  const r = await api.settle(token, d.id);
                  alert(`Collected ${r.settledEGP} EGP from ${d.name} (${r.orderCount} orders)`);
                  refresh();
                }}
              >
                Received cash
              </button>
            </div>
          );
        })}

        {/* Orders */}
        <div className="section-head"><h3>Orders</h3></div>
        <NewOrder onCreate={async (addr, amt) => { await api.createOrder(token, addr, amt); refresh(); }} />
        <div className="card" style={{ padding: '4px 12px' }}>
          {orders.map((o) => (
            <div className="order" key={o.id}>
              <div className="grow">
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customerAddress}</div>
                <div className="subtle">{egp(o.totalCashToCollect)}</div>
                {o.status === 'Pending' && (
                  <select
                    className="select"
                    defaultValue=""
                    onChange={(e) => e.target.value && api.assign(token, o.id, e.target.value).then(refresh)}
                  >
                    <option value="" disabled>Assign to…</option>
                    {drivers.filter((d) => d.status !== 'Offline').map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <span className="subtle" style={{ fontWeight: 600 }}>
                <span
                  className="status-dot"
                  style={{ background: o.status === 'Delivered' ? 'var(--ok)' : o.status === 'Pending' ? '#f0a500' : 'var(--brand)' }}
                />
                {o.status}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function NewOrder({ onCreate }: { onCreate: (addr: string, amt: number) => void }) {
  const [addr, setAddr] = useState('');
  const [amt, setAmt] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input className="mini-input" style={{ flex: 2 }} placeholder="Customer address"
        value={addr} onChange={(e) => setAddr(e.target.value)} />
      <input className="mini-input" style={{ width: 70 }} placeholder="EGP"
        value={amt} onChange={(e) => setAmt(e.target.value)} />
      <button className="add-btn"
        onClick={() => { if (addr && amt) { onCreate(addr, Number(amt)); setAddr(''); setAmt(''); } }}>+</button>
    </div>
  );
}
