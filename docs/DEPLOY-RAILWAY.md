# Deploying El Kaptin on Railway

Railway runs three things for us: a **Postgres** database, the **backend**
(REST + WebSocket), and the **dashboard** (static SPA served by a tiny web
process). Config lives in `backend/railway.json` and `dashboard/railway.json`,
so most of this is just clicking + pasting a few URLs.

Everything below deploys from the **`main`** branch.

---

## 1. Create the project + database

1. Sign up at [railway.com](https://railway.com) and connect GitHub.
2. **New Project → Deploy from GitHub repo →** pick `SYNQ-WFM-`.
   (Railway may auto-create one service — we'll fix its settings in step 2.)
3. In the project, **New → Database → Add PostgreSQL**. Railway provisions it
   and exposes a `DATABASE_URL` you'll reference below.

## 2. Backend service

Add/point a service at the repo with **Root Directory = `backend`**
(Settings → Source → Root Directory). Railway reads `backend/railway.json` for
the build/start commands automatically.

Set these **Variables** on the backend service:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway variable reference — pick your Postgres service) |
| `JWT_SECRET` | a long random string (≥16 chars). Generate one, keep it secret. |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | your dashboard's public URL (fill in after step 3, e.g. `https://elkaptin-dashboard.up.railway.app`) |

Under **Settings → Networking**, click **Generate Domain** to get the public
backend URL (e.g. `https://elkaptin-backend.up.railway.app`). Note it — the
dashboard and the mobile app both need it. WebSockets work on this domain over
`wss://`.

> On boot the backend runs `prisma db push` to create the tables, then starts.
> The `/health` endpoint is the healthcheck.

### Seed a starter login (optional)

To poke around immediately, open the backend service's shell (or a one-off
command) and run:

```
npx tsx src/db/seed.ts
```

Gives you `manager@demo.eg` / `password123` plus demo drivers.

## 3. Dashboard service

Add another service on the **same repo** with **Root Directory = `dashboard`**.
It reads `dashboard/railway.json` (build the SPA, serve `dist`).

Set these **Variables** (Vite inlines them at **build** time, so set them before
the first build — redeploy if you change them):

| Variable | Value |
|----------|-------|
| `VITE_API_BASE` | your backend URL, e.g. `https://elkaptin-backend.up.railway.app` |
| `VITE_WS_BASE`  | same host with `wss://`, e.g. `wss://elkaptin-backend.up.railway.app` |

Do **not** set `NODE_ENV=production` on the dashboard service — it needs its dev
dependencies (Vite/TypeScript) to build.

**Settings → Networking → Generate Domain** for the dashboard's public URL, then
go back and put that URL into the backend's `CORS_ORIGIN` (step 2) and redeploy
the backend.

## 4. Build the driver APK against your backend

GitHub → **Actions → "Build driver APK" → Run workflow**, enter:
- `api_base` = your backend `https://…`
- `ws_base` = your backend `wss://…`

Download the `el-kaptin-driver-apk` artifact and install it on the phone.

## 5. Smoke test

1. Open the dashboard URL → log in (`manager@demo.eg` / `password123` if seeded).
2. On the phone, open El Kaptin → log in as a driver (`01000000001` / `1234`) →
   grant location **"Allow all the time"** → **Start shift**.
3. Watch the driver appear and move on the dashboard map.

---

## Notes / gotchas

- **`tsx` and `prisma` are runtime deps** (we run the server via `tsx` in prod),
  so they stay installed even with `NODE_ENV=production`. Don't move them back to
  devDependencies.
- **Free Postgres has no backups.** Turn on backups (or a nightly `pg_dump`)
  before onboarding a real merchant — see `PILOT.md`.
- **Schema changes** use `prisma db push` here (not migrations); fine for a pilot.
- The rate limiter is in-memory, so keep the backend at **one instance** for now.
