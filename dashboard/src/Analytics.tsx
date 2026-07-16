// Compact "today" analytics strip for the manager.
import { useEffect, useState } from 'react';
import { api, type Analytics as A } from './api';
import { useLang } from './i18n';

export function Analytics({ token, refreshKey }: { token: string; refreshKey: number }) {
  const { t } = useLang();
  const [a, setA] = useState<A | null>(null);

  useEffect(() => {
    api.analytics(token).then(setA).catch(() => {});
  }, [token, refreshKey]);

  if (!a) return null;
  const tiles: [string, string][] = [
    [t('ordersToday'), String(a.ordersToday)],
    [t('deliveredToday'), String(a.deliveredToday)],
    [t('avgTime'), a.avgDeliveryMinutes != null ? t('minsShort', { n: a.avgDeliveryMinutes }) : '—'],
    [t('collected'), a.collectedEGP + ' EGP'],
  ];

  return (
    <div className="analytics">
      <div className="analytics-label">{t('today')}</div>
      <div className="analytics-grid">
        {tiles.map(([label, val]) => (
          <div className="stat-tile" key={label}>
            <div className="stat-val">{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
