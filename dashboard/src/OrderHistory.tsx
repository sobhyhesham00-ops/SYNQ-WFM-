// Order history — all past orders (incl. Delivered / Failed / Cancelled) with
// status / driver / date filters and pagination. Opened from the dashboard header.
import { useEffect, useState } from 'react';
import { api, type Driver, type Order, egp } from './api';
import { useLang } from './i18n';

const STATUSES = ['Pending', 'Assigned', 'PickedUp', 'Delivered', 'Failed', 'Cancelled'];
const LIMIT = 20;

export function OrderHistory({ token, drivers, onClose }: {
  token: string; drivers: Driver[]; onClose: () => void;
}) {
  const { t } = useLang();
  const [status, setStatus] = useState('');
  const [driverId, setDriverId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ orders: Order[]; total: number } | null>(null);

  useEffect(() => {
    let live = true;
    api.orderHistory(token, { status, driverId, from, to, limit: LIMIT, offset })
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setData({ orders: [], total: 0 }); });
    return () => { live = false; };
  }, [token, status, driverId, from, to, offset]);

  // Changing any filter jumps back to the first page.
  const onFilter = (setter: (v: string) => void) => (v: string) => { setter(v); setOffset(0); };
  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name ?? '—';
  const total = data?.total ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(560px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>📜 {t('history')}</h2>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <select className="select" value={status} onChange={(e) => onFilter(setStatus)(e.target.value)}>
            <option value="">{t('allStatuses')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
          <select className="select" value={driverId} onChange={(e) => onFilter(setDriverId)(e.target.value)}>
            <option value="">{t('allDrivers')}</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="date" className="mini-input" value={from} aria-label={t('fromDate')}
            onChange={(e) => onFilter(setFrom)(e.target.value)} />
          <input type="date" className="mini-input" value={to} aria-label={t('toDate')}
            onChange={(e) => onFilter(setTo)(e.target.value)} />
        </div>

        <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          {!data ? (
            <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>…</div>
          ) : data.orders.length === 0 ? (
            <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>{t('noResults')}</div>
          ) : (
            data.orders.map((o) => (
              <div className="order" key={o.id}>
                <div className="grow">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customerAddress}</div>
                  <div className="subtle">
                    {egp(o.totalCashToCollect)} · {driverName(o.driverId)}
                    {o.createdAt ? ` · ${new Date(o.createdAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <span className={`chip ${o.status}`}>{t(`status.${o.status}`)}</span>
              </div>
            ))
          )}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
          <button className="ghost-pill" disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}>← {t('prev')}</button>
          <span className="subtle">
            {t('showingCount', { n: String(Math.min(offset + LIMIT, total)), total: String(total) })}
          </span>
          <button className="ghost-pill" disabled={offset + LIMIT >= total}
            onClick={() => setOffset(offset + LIMIT)}>{t('next')} →</button>
        </div>
      </div>
    </div>
  );
}
