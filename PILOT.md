# El Kaptin — Pilot Runbook

How to take El Kaptin from this repo to one real merchant tracking real drivers
for a 2–4 week pilot. Read [`DEPLOY.md`](DEPLOY.md) first for the mechanics of
shipping; this doc is about running the pilot and knowing what's solid vs.
what's still a stub.

## What's real vs. what's a stub

| Area | State | Notes |
|------|-------|-------|
| Live GPS tracking | ✅ Real | Phone GPS → foreground service → batched WS frames |
| COD cash drawer / settlement | ✅ Real | Per-driver "in hand", handover, end-of-day totals |
| OTP proof-of-delivery | ✅ Real | Driver enters customer code to mark Delivered |
| Customer tracking links | ✅ Real | `/t/<token>`, shows delivery code + rating |
| Ratings, route replay, analytics, leaderboard | ✅ Real | Backed by real Postgres |
| Subscription plans + feature gating | ✅ Real | Backend-enforced (402 when over-tier) |
| Auth (access + refresh tokens, rate limit) | ✅ Real | Managers 2h access + 30d refresh; drivers 12h |
| Runtime error handling | ✅ Real | Global handler + async forwarding: a DB blip returns a clean 500, never a hung request; process survives stray rejections |
| **Wallet checkout (Fawry / Vodafone / InstaPay)** | ⚠️ **Stub** | We issue a reference and record a receipt — **no real charge is captured.** Confirm payment out-of-band before upgrading a merchant. |
| Push notifications (FCM) | ⚠️ Stub | Falls back to console log if `FCM_SERVER_KEY` unset |
| WS token refresh | ⚠️ Gap | The tracking socket uses the access token; long shifts covered by the 12h driver TTL, but there's no mid-socket refresh |
| Rate limiter | ⚠️ Single-instance | In-memory; correct only while running one backend replica |
| DB schema management | ⚠️ `db push` | We use `prisma db push`, not migrations — fine for pilot, migrate before scaling |
| Backups | ❌ None wired | See "Before you onboard a real merchant" |

## Before you onboard a real merchant

1. **Deploy** via the Render Blueprint (`render.yaml`) or Docker (`DEPLOY.md`).
2. **Set production env** on the backend:
   - `NODE_ENV=production` (the server refuses to boot on a default `JWT_SECRET`).
   - `JWT_SECRET` — strong, generated (Render's Blueprint does this).
   - `CORS_ORIGIN` — your dashboard origin(s), comma-separated. **Do not leave `*`.**
3. **Point the dashboard** at the backend: `VITE_API_BASE` / `VITE_WS_BASE`.
4. **Turn on a real DB backup.** On Render's paid Postgres, enable daily backups;
   on a VPS, add a nightly `pg_dump` cron. The free tier has none — assume the
   pilot DB can vanish and keep onboarding data reproducible.
5. **Seed nothing in prod.** The seed script is demo data; onboard the merchant
   through the real signup + "Add driver" flows instead.

## Onboarding the merchant (10 minutes)

1. Merchant signs up on the dashboard (business name + type + first manager).
2. Manager adds each driver (name, phone, PIN). Driver count is capped by plan.
3. Set the shop location (used for proximity assignment) and, if relevant,
   Ramadan mode / iftar time.
4. Hand each driver their phone setup (below).

## Driver phone setup (do this per phone — it's the #1 pilot failure)

Egyptian budget phones (Xiaomi/Realme/Oppo/Samsung) kill background apps. The
foreground service survives *only if the OS allow-lists are set*:

- **Battery:** set El Kaptin to **"No restrictions" / "Don't optimize."**
- **Autostart:** enable it (Xiaomi/Oppo/Vivo have a separate Autostart list).
- **Location permission:** **"Allow all the time"**, not "only while using."
- Confirm the persistent "أنت متصل" notification stays up after locking the
  screen and opening Google Maps.

## What to watch during the pilot

- Drivers showing **Offline** mid-shift → phone battery/autostart setting missed.
- Cash drawer "in hand" not zeroing at day's end → driver skipped handover, or a
  delivery was marked without OTP.
- Customer tracking link blank → the map CDN is blocked on that network; the
  delivery code + actions still render (we guard the map init).
- 429s on login → rate limiter tripped (8 attempts / 5 min / IP); expected under
  a shared NAT, benign.

## Known limitations to disclose to the pilot merchant

- Payments are **manual/out-of-band** for now — the in-app checkout only records
  a reference. Don't promise auto-billing.
- Single backend instance; a restart drops the in-memory rate-limit counters and
  any un-flushed state. Drivers' queued fixes survive locally and re-flush.
- No SMS/WhatsApp gateway wired — customer notifications are share-links, not
  automated sends.

## Rollback

- **Bad deploy:** Render → roll back to the previous deploy; the DB is untouched
  by app redeploys.
- **Bad data:** restore from the most recent `pg_dump` / Render backup (step 4).
- **Kill switch:** scale the backend to 0 or stop the service; drivers' apps
  queue fixes offline and re-sync when it's back.

## After a successful pilot — hardening backlog

In rough priority order:
1. Real payment capture (Paymob/Fawry API) replacing the checkout stub.
2. Prisma **migrations** instead of `db push`.
3. Redis-backed rate limiter + shared session state (enables >1 replica).
4. WS access-token refresh for very long shifts.
5. Automated customer SMS/WhatsApp on dispatch + delivery.
