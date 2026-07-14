# Tayar — Driver Tracking SaaS (MVP blueprint)

Hardware-free, phone-GPS live tracking + Cash-on-Delivery (COD) reconciliation
for independent restaurants and takeaway chains running private delivery fleets
(*tayareen*) in Egypt.

## What's in here

```
driver-tracking-saas/
├── docs/
│   └── ARCHITECTURE.md          §1  System architecture + WS-vs-Firebase decision
├── backend/                     Node + WebSocket + PostgreSQL (the whole backend)
│   ├── prisma/schema.prisma     §2  PostgreSQL schema (Prisma)
│   ├── sql/schema.sql           §2  Same schema as raw SQL
│   └── src/
│       ├── server.ts            One process = REST API + WS tracking
│       ├── ws/tracking.ts       §1  Batched location ingest + dashboard fan-out
│       ├── routes/orders.ts     Order lifecycle (transactional)
│       └── services/
│           ├── cashDrawer.ts    §4  COD reconciliation (the money logic)
│           └── auth.ts          JWT stubs
├── mobile/flutter/              §3  Driver app w/ background foreground service
│   ├── pubspec.yaml
│   ├── android/AndroidManifest.snippet.xml   Permissions + FG service + OEM notes
│   └── lib/
│       ├── main.dart
│       └── services/
│           ├── location_service.dart   §3  The battery-proof tracking core
│           └── api_client.dart
├── firestore/                   §1/2  Alternative if you skip the SQL backend
│   ├── firestore-schema.md
│   └── firestore.rules
└── dashboard/src/useTracking.ts §1  Manager live-map + cash-drawer hook (React)
```

## The four answers, in one line each

1. **Real-time strategy** — one Node process holds a WebSocket per driver
   (batched frames every 20s) and fans the latest point out to dashboard rooms.
   Chosen over Firestore because per-operation billing is wrong for
   high-frequency location writes, and SQL transactions are right for cash. See
   `docs/ARCHITECTURE.md`.
2. **Schema** — `restaurants · drivers · orders · location_logs` with money in
   integer piastres and denormalized `current_lat/lng` hot columns. See
   `backend/prisma/schema.prisma` / `backend/sql/schema.sql`.
3. **Background tracking** — Android **foreground service** with a visible
   notification (`flutter_background_service`) so budget OEM phones can't freeze
   it; batched, movement-filtered GPS with an offline queue. See
   `mobile/flutter/lib/services/location_service.dart` and the manifest snippet.
4. **Cash drawer** — aggregate each driver's `Delivered && !settled` orders;
   settle atomically under a row lock. See
   `backend/src/services/cashDrawer.ts`.

## Local quick start (backend)

```bash
cd backend
npm install
# set DATABASE_URL + JWT_SECRET in .env
npx prisma migrate dev --name init
npm run dev            # REST + WS on :8080
```

## Recommended lean hosting (flat ~$5–15/mo)

- **Backend + Postgres:** Fly.io, Railway, Render, or a Hetzner CX small VM.
- **Dashboard:** any static host (Vercel/Netlify/Cloudflare Pages).
- **Maps:** the dashboard can use free-tier MapLibre + OpenStreetMap tiles to
  avoid Google Maps billing; drivers use their own installed Google Maps for
  turn-by-turn (deep link, no API cost to you).

> This is an architectural blueprint with production-grade patterns and runnable
> templates — wire in real auth, migrations, and error handling before shipping.
