// Driver-performance leaderboard (Growth+). Ranks the fleet over the last 7 days
// by deliveries, with avg time, rating, and cash collected.
import { useEffect, useState } from 'react';
import { api } from './api';
import { useLang } from './i18n';

type Row = { driverId: string; name: string; deliveries: number; collectedEGP: string; avgMinutes: number | null; rating: number | null };
const MEDAL = ['🥇', '🥈', '🥉'];
const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export function Leaderboard({ token, onClose }: { token: string; onClose: () => void }) {
  const { t } = useLang();
  const [board, setBoard] = useState<Row[] | null>(null);

  useEffect(() => { api.leaderboard(token).then((r) => setBoard(r.board)).catch(() => setBoard([])); }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 'min(640px, 96vw)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>🏆 {t('leaderboard')}</h2>
          <button className="ghost-btn" onClick={onClose}>✕</button>
        </div>
        <div className="subtle" style={{ marginBottom: 12 }}>{t('last7days')}</div>
        {!board ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>…</div>
          : board.length === 0 ? <div className="subtle" style={{ padding: 16, textAlign: 'center' }}>{t('noLeaderboard')}</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="receipts lb">
                <thead><tr>
                  <th>#</th><th>{t('colDriver')}</th><th>{t('colDeliveries')}</th>
                  <th>{t('colAvg')}</th><th>{t('colRating')}</th><th>{t('colCash')}</th>
                </tr></thead>
                <tbody>{board.map((r, i) => (
                  <tr key={r.driverId} className={i === 0 ? 'lead' : ''}>
                    <td style={{ fontSize: 18 }}>{MEDAL[i] ?? i + 1}</td>
                    <td><div className="row" style={{ gap: 8 }}><div className="avatar" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 12 }}>{initials(r.name)}</div><b>{r.name}</b></div></td>
                    <td className="num"><b>{r.deliveries}</b></td>
                    <td className="num">{r.avgMinutes != null ? t('minsShort', { n: r.avgMinutes }) : '—'}</td>
                    <td className="num">{r.rating != null ? `⭐ ${r.rating.toFixed(1)}` : '—'}</td>
                    <td className="num">{r.collectedEGP} EGP</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
