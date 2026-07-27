# Aura — Backend API

Express + TypeScript + Prisma (Postgres) + Socket.io.

## Run
```bash
cp .env.example .env
npm install
docker compose up -d db          # or point DATABASE_URL at any Postgres
npm run prisma:migrate           # create the schema
npm run seed                     # gifts, cosmetics, VIP tiers, badges
npm run dev                      # http://localhost:4000
```

## REST endpoints (prefix `/api`)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | create account (+wallet, levels, presence) |
| POST | `/auth/login` | – | log in |
| POST | `/auth/refresh` | – | new access token |
| GET | `/auth/me` | ✔ | current user |
| PATCH | `/users/me/profile` | ✔ | edit profile |
| PUT | `/users/me/languages` | ✔ | set spoken languages + proficiency |
| PATCH | `/users/me/presence` | ✔ | status + mood emoji |
| PUT | `/users/me/loadout` | ✔ | equip cosmetics |
| GET | `/users/:id` | – | public profile (levels, badges, VIP) |
| POST | `/users/:id/follow` | ✔ | follow a user |
| POST | `/rooms` | ✔ | create room (with language controls) |
| GET | `/rooms?language=&category=&q=` | – | discover rooms (language filtered) |
| POST | `/rooms/:id/join` | ✔ | join (returns Agora token + canSpeak) |
| POST | `/rooms/:id/leave` | ✔ | leave |
| GET | `/gifts/catalog` | – | gift catalog |
| POST | `/gifts/send` | ✔ | send a gift (transactional) |
| GET | `/wallet` | ✔ | coin/diamond balance |
| GET | `/wallet/transactions` | ✔ | ledger history |
| POST | `/wallet/topup` | ✔ | credit coins (after receipt verify) |
| GET | `/identity/store` | – | cosmetic storefront |
| POST | `/identity/store/:id/buy` | ✔ | buy a cosmetic |
| GET | `/identity/inventory` | ✔ | owned cosmetics |
| GET | `/identity/levels` | ✔ | charm/wealth/activity progress |
| GET | `/identity/leaderboard?board=wealth\|charm` | – | leaderboards |
| POST | `/identity/bonds` | ✔ | create a CP/couple bond |

## Realtime (Socket.io)
Handshake auth: `{ auth: { token } }`. Events documented in
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md): `room:join/leave/message`,
`gift:send/recv/broadcast`, `room:entrance`, `match:enqueue/found/message/skip/ended`,
`wallet:update`.

## Integration seams
Search the code for `TODO(provider: ...)` and `TODO(scale: redis)` / `TODO(safety)`.
