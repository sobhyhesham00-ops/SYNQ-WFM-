// Orders needing the manager's attention — failed deliveries, orders waiting
// too long unassigned, and assigned orders not yet picked up.
import { useEffect, useState } from 'react';
import { api, type Driver, type Order, egp } from './api';
import { useLang } from './i18n';

type Data = Awaited<ReturnType<typeof api.attention>>;

export function AttentionQueue({ token, drivers, onClose }: {
  token: string; drivers: Driver[]; onClose: () => void;
}) {
  const { t } = useLang();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let live = true;
    api.attention(token).then((d) => { if (live) setData(d); }).catch(() => {});
    return () => { live = false; };
  }, [token]);

  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.name ?? '—';

  const group = (label: string, orders: Order[]) => orders.length === 0 ? null : (
    <div style={{ marginBottom: 14 }}>
      <div className="subtle" style={{ fontWeight: 700, margin: '4px 0 6px' }}>{label} · {orders.length}</div>
      {orders.map((o) => (
        <div className="order" key={o.id}>
          <div className="grow">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customerAddress}</div>
            <div className="subtle">{egp(o.totalCashToCollect)}{o.driverId ? ` · ${driverName(o.driverId)}` : ''}</div>
          </div>
          <span className={`chip ${o.status}`}>{t(`status.${o.status}`)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(520px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>⚠️ {t('attention')}</h2>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!data ? (
            <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>…</div>
          ) : data.count === 0 ? (
            <div className="subtle" style={{ padding: 24, textAlign: 'center' }}>{t('allClear')}</div>
          ) : (
            <>
              {group(t('failedDeliveries'), data.failed)}
              {group(t('stalePending'), data.stalePending)}
              {group(t('staleAssigned'), data.staleAssigned)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
