// Triple-progression level math. XP thresholds grow super-linearly so higher levels feel
// meaningful (and, for Wealth, expensive) — the core of the status ladder.
//
// Level N requires cumulative XP: BASE * (N-1)^EXP
const BASE = 100;
const EXP = 1.8;

export function levelForXp(xp: bigint | number): number {
  const x = Number(xp);
  if (x <= 0) return 1;
  // invert cumulative(N) = BASE * (N-1)^EXP  →  N = 1 + (x / BASE)^(1/EXP)
  return Math.max(1, Math.floor(1 + Math.pow(x / BASE, 1 / EXP)));
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(BASE * Math.pow(level - 1, EXP));
}

export function progressToNext(xp: bigint | number): {
  level: number;
  current: number;
  needed: number;
  pct: number;
} {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const current = Number(xp) - floor;
  const needed = ceil - floor;
  return { level, current, needed, pct: needed > 0 ? current / needed : 1 };
}
