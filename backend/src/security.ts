/**
 * Lightweight security middleware — no external deps, so it runs the same in
 * dev and on Render's free tier.
 *   - securityHeaders: sane defaults for an API + a tiny static tracking page.
 *   - rateLimit: in-memory fixed-window limiter (per-process). Good enough for a
 *     single-instance pilot; swap for Redis when we run more than one replica.
 */
import type { Request, Response, NextFunction } from 'express';

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // The driver app and dashboard are the only geolocation consumers; keep it self-scoped.
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  next();
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** How to bucket requests. Default: client IP. */
  key?: (req: Request) => string;
}

/** Returns an Express middleware enforcing `max` requests per `windowMs` per key. */
export function rateLimit({ windowMs, max, key }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const keyFn = key ?? ((req: Request) => req.ip ?? 'unknown');

  // Opportunistic cleanup so the map doesn't grow unbounded over a long run.
  function sweep(now: number) {
    if (hits.size < 2048) return;
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const k = keyFn(req);
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(k, entry);
      sweep(now);
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'too many requests', retryAfter });
    }
    next();
  };
}
