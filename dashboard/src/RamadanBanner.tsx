// Ramadan iftar-rush banner: counts down to maghrib (iftar) so the manager
// gets drivers ready before the surge. Egypt's delivery peak in Ramadan is the
// ~2 hours before iftar (people order for the table) — this makes it visible.
import { useEffect, useState } from 'react';
import { useLang } from './i18n';

function msUntilIftar(iftar: string): number {
  const [h, m] = iftar.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  return target.getTime() - now.getTime();
}

export function RamadanBanner({ iftarTime }: { iftarTime: string }) {
  const { t } = useLang();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = msUntilIftar(iftarTime);
  const passed = ms <= 0;
  const hh = Math.floor(ms / 3_600_000);
  const mm = Math.floor((ms % 3_600_000) / 60_000);
  const ss = Math.floor((ms % 60_000) / 1000);
  const clock = `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  // The rush window: highlight when iftar is within 2 hours.
  const rush = !passed && ms < 2 * 3_600_000;

  return (
    <div className={`ramadan-banner ${rush ? 'rush' : ''}`}>
      <span className="ramadan-moon">🌙</span>
      <span className="grow">
        {passed ? t('iftarPassed') : t('iftarIn', { time: clock })}
      </span>
      <span className="ramadan-time">{iftarTime}</span>
    </div>
  );
}
