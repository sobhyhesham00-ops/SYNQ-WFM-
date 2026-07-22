// Daily revenue (delivered COD collected) over the last N days — a small
// single-series bar chart. One brand hue, recessive baseline, per-bar hover
// tooltip, and a direct label on the peak day. (See dataviz skill.)
import { useEffect, useMemo, useState } from 'react';
import { api, egp } from './api';
import { useLang } from './i18n';

type Point = { date: string; deliveries: number; collectedPiastres: number; collectedEGP: string };

// viewBox geometry (scales to container width via CSS).
const W = 340, H = 132, PAD_L = 6, PAD_R = 6, PAD_T = 20, PAD_B = 20;
const plotW = W - PAD_L - PAD_R;
const plotH = H - PAD_T - PAD_B;

export function RevenueChart({ token }: { token: string }) {
  const { t, lang } = useLang();
  const [series, setSeries] = useState<Point[] | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    api.dailyAnalytics(token, 14).then((d) => { if (live) setSeries(d.series); }).catch(() => {});
    return () => { live = false; };
  }, [token]);

  const { maxV, total, peakIdx } = useMemo(() => {
    const s = series ?? [];
    let maxV = 0, total = 0, peakIdx = -1;
    s.forEach((p, i) => { total += p.collectedPiastres; if (p.collectedPiastres > maxV) { maxV = p.collectedPiastres; peakIdx = i; } });
    return { maxV, total, peakIdx };
  }, [series]);

  if (!series) return null;
  const n = series.length;
  const slot = plotW / n;
  const barW = Math.max(2, slot - 3);
  const x = (i: number) => PAD_L + i * slot + (slot - barW) / 2;
  const h = (v: number) => (maxV > 0 ? (v / maxV) * plotH : 0);
  const fmtDay = (d: string) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; };

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t('revenueTitle')}</div>
          <div className="subtle" style={{ fontSize: 12 }}>{t('lastNDays', { n: String(n) })}</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>{egp(total)}</div>
      </div>

      {maxV === 0 ? (
        <div className="subtle" style={{ textAlign: 'center', padding: '28px 0' }}>{t('noRevenueYet')}</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
            role="img" aria-label={t('revenueTitle')}>
            {/* recessive baseline */}
            <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke="var(--line)" strokeWidth="1" />
            {series.map((p, i) => {
              const bh = h(p.collectedPiastres);
              const isHover = hover === i;
              return (
                <rect key={p.date} x={x(i)} y={PAD_T + plotH - bh} width={barW} height={bh} rx={2}
                  fill="var(--brand)" opacity={hover == null ? (i === peakIdx ? 1 : 0.82) : isHover ? 1 : 0.35} />
              );
            })}
            {/* direct label on the peak day */}
            {peakIdx >= 0 && (
              <text x={x(peakIdx) + barW / 2} y={PAD_T + plotH - h(maxV) - 6} textAnchor="middle"
                fontSize="10" fontWeight="700" fill="var(--ink)">
                {Math.round(maxV / 100).toLocaleString()}
              </text>
            )}
            {/* sparse x labels: first + last */}
            <text x={x(0) + barW / 2} y={H - 6} textAnchor="start" fontSize="9" fill="var(--muted)">{fmtDay(series[0].date)}</text>
            <text x={x(n - 1) + barW / 2} y={H - 6} textAnchor="end" fontSize="9" fill="var(--muted)">{fmtDay(series[n - 1].date)}</text>
            {/* hover hit targets (full height) */}
            {series.map((p, i) => (
              <rect key={`hit-${p.date}`} x={PAD_L + i * slot} y={PAD_T} width={slot} height={plotH}
                fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            ))}
          </svg>

          {hover != null && (
            <div style={{
              position: 'absolute', top: 46,
              insetInlineStart: `clamp(6px, calc(${((x(hover) + barW / 2) / W) * 100}% - 60px), calc(100% - 126px))`,
              width: 120, pointerEvents: 'none', background: 'var(--ink)', color: 'var(--bg)',
              borderRadius: 8, padding: '6px 8px', fontSize: 11, textAlign: 'center', boxShadow: '0 6px 18px rgba(0,0,0,.25)',
            }}>
              <div style={{ fontWeight: 700 }}>{new Date(series[hover].date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })}</div>
              <div>{series[hover].collectedEGP} EGP</div>
              <div style={{ opacity: 0.8 }}>{t('deliveriesN', { n: String(series[hover].deliveries) })}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
