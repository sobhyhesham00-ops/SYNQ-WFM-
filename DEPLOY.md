# Deploying El Kaptin

Three ways to ship, cheapest → most control.

> **On Railway?** See [`docs/DEPLOY-RAILWAY.md`](docs/DEPLOY-RAILWAY.md) — the
> repo ships `backend/railway.json` + `dashboard/railway.json` for it.

## Option 1 — Render Blueprint (one click)

The whole stack (Postgres + backend + dashboard) is described in
[`render.yaml`](render.yaml).

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo.
3. When prompted, set the dashboard's `VITE_API_BASE` / `VITE_WS_BASE` to the
   backend URL Render assigns (e.g. `https://meshwar-backend.onrender.com` and
   `wss://meshwar-backend.onrender.com`).
4. Apply. `JWT_SECRET` is generated; `DATABASE_URL` is wired automatically.
5. Seed once (Render shell on the backend service):
   `npx tsx src/db/seed.ts`

The customer tracking page is served by the backend at
`https://<backend>/t/<token>`.

## Option 2 — Docker Compose (VPS / your own box)

```bash
docker compose up --build -d
docker compose exec backend npx tsx src/db/seed.ts
```
Backend on `:8080`. Build the dashboard image separately, pointing it at the
backend:
```bash
docker build -t meshwar-dashboard \
  --build-arg VITE_API_BASE=https://api.yourdomain.com \
  --build-arg VITE_WS_BASE=wss://api.yourdomain.com ./dashboard
```

## Option 3 — Fly.io (backend) + any static host (dashboard)

Backend:
```bash
cd backend
fly launch --no-deploy          # generates fly.toml (or use the one here)
fly postgres create             # then: fly postgres attach <db>
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly deploy
fly ssh console -C "npx tsx src/db/seed.ts"
```
Dashboard: build with `VITE_API_BASE`/`VITE_WS_BASE` pointing at the Fly URL and
drop `dashboard/dist` on Vercel / Netlify / Cloudflare Pages.

## Production hardening checklist

- [ ] Swap `prisma db push` for real migrations (`prisma migrate deploy`).
- [ ] Restrict CORS to your dashboard origin (currently open).
- [ ] Rotate `JWT_SECRET`; add refresh tokens for the driver app.
- [ ] Put the WebSocket layer behind Redis pub/sub before running >1 instance.
- [ ] Partition `location_logs` by month (it is the only unbounded table).
