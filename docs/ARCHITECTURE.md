# Aura — Architecture

## Overview

Aura is a **client–server** system: a cross-platform mobile client (Expo/React Native) talks
to a stateless **REST API** for CRUD/transactions and a **WebSocket gateway** (Socket.io)
for realtime room state, chat, presence, and gift events. Low-latency **voice** rides on a
dedicated media SDK (Agora), which the backend only *authorizes* (issues join tokens) rather
than proxies.

```
                 ┌──────────────────────────── Mobile (Expo / React Native, TS) ───────────────────────────┐
                 │  Screens: Auth · Rooms · Room · RandomChat · Wallet/Store · Identity · Profile           │
                 │  State: Zustand   ·   API client (REST)   ·   Socket client (realtime)   ·   Agora SDK   │
                 └───────────┬───────────────────────────────┬───────────────────────────────┬─────────────┘
                REST/HTTPS   │                    WebSocket   │                    Media (SFU) │
                             ▼                                ▼                                ▼
                 ┌───────────────────────┐        ┌───────────────────────┐        ┌───────────────────┐
                 │  Express REST API     │        │  Socket.io gateway    │        │  Agora (voice)    │
                 │  auth·users·rooms·    │◄──────►│  rooms·chat·presence· │        │  token-authorized │
                 │  gifts·wallet·identity│  share │  gifts·matchmaking    │        │  by backend       │
                 └───────────┬───────────┘  state └───────────┬───────────┘        └───────────────────┘
                             │                                │
                             ▼                                ▼
                 ┌───────────────────────┐        ┌───────────────────────┐
                 │  PostgreSQL (Prisma)  │        │  Redis (presence,     │
                 │  durable state        │        │  matchmaking, pub/sub)│   ← add for scale
                 └───────────────────────┘        └───────────────────────┘
```

## Backend (`/backend`)

- **Runtime:** Node.js + TypeScript, **Express** for REST, **Socket.io** for realtime.
- **ORM/DB:** **Prisma** over **PostgreSQL**. Schema in `prisma/schema.prisma`.
- **Auth:** JWT (access + refresh). Phone/email OTP or social login in production.
- **Modules** (`src/modules/*`), each a router + service:
  - `auth` — register/login, JWT issuance, `me`.
  - `users` — profiles, status/mood, follows, identity load-out (worn cosmetics).
  - `rooms` — create/list/join/leave audio rooms, seats/roles, Agora token issuance.
  - `chat` — random-chat matchmaking queue + 1:1 sessions.
  - `gifts` — gift catalog + send-gift transaction (debits coins, credits diamonds,
    updates Wealth/Charm, emits realtime event).
  - `wallet` — coin balance, top-up (IAP/Stripe verification seam), diamond balance,
    ledger of transactions.
  - `identity` — levels (Charm/Wealth/Activity), cosmetics store & inventory, VIP tiers,
    badges, leaderboards, CP bonds, families.
- **Realtime gateway** (`src/realtime/socket.ts`): authenticates sockets via JWT, manages
  room membership, broadcasts chat/gift/seat/entrance events, runs the random-chat matcher.
- **Cross-cutting:** config/env loader, Prisma singleton, auth middleware, error handler,
  rate limiting, request logging.

### Why these choices
- **Express + Socket.io + Prisma**: fast to build, huge ecosystem, easy hiring, scales
  horizontally behind a load balancer once realtime state moves to **Redis** (pub/sub +
  presence + matchmaking) — the single change that unlocks multi-instance scale.
- **Agora for media**: building global low-latency audio SFU in-house is a multi-year effort;
  Agora/LiveKit/100ms give it turnkey with per-minute pricing. Backend only mints tokens.
- **Postgres**: relational integrity matters for a *wallet/ledger* (money). Use transactions
  for gift sends and top-ups so balances never drift.

## Mobile (`/mobile`)

- **Expo + React Native + TypeScript** → one codebase for **iOS + Android** (and web preview).
- **Navigation:** React Navigation (auth stack → main tabs: Rooms · Discover · Chat · Wallet
  · Profile).
- **State:** Zustand stores (auth/session, wallet, rooms). REST via a typed `api` client;
  realtime via a Socket.io client hook.
- **Voice:** `react-native-agora` (dev client / EAS build; not available in plain Expo Go).
- **Payments:** `expo-in-app-purchases` / RevenueCat for coins; server-side receipt
  verification before crediting coins.
- **Identity rendering:** frames, entrance effects, bubbles, badges are data-driven from the
  user's worn load-out so new cosmetics ship without app updates.

## Data model (high level)

`User` ↔ `Profile` ↔ `IdentityLoadout` (worn cosmetics) · `Wallet` (coins/diamonds) ·
`Transaction` (ledger) · `Room` ↔ `RoomMember`/`Seat` · `Gift` ↔ `GiftEvent` ·
`CosmeticItem` ↔ `InventoryItem` · `LevelStats` (charm/wealth/activity) · `Badge`/`UserBadge`
· `VipTier` · `Bond` (CP) · `Family`/`FamilyMember` · `Match`/`Like` · `Follow`.
Full definitions in `backend/prisma/schema.prisma`.

## Realtime event contract (Socket.io)

| Event (client→server) | Purpose |
| --- | --- |
| `room:join` / `room:leave` | join/leave a room (returns Agora token, triggers `entrance`) |
| `room:seat:request` / `seat:set` | mic seat management |
| `room:message` | in-room text/emote |
| `gift:send` | send a gift (server validates coins, then broadcasts) |
| `match:enqueue` / `match:skip` | random-chat matchmaking |
| `presence:status` | set online/away/busy/invisible + mood |

| Event (server→client) | Purpose |
| --- | --- |
| `room:state` | full/patch room state (members, seats) |
| `room:entrance` | broadcast entrance effect for VIP/mount |
| `room:message` / `gift:recv` | fan-out chat & gift animations |
| `match:found` | random-chat pair established |
| `wallet:update` | balance changes (after gift/top-up) |

## Scaling path
1. **MVP (this scaffold):** single API instance, in-memory realtime/matchmaking, Postgres.
2. **Add Redis:** presence, matchmaking queue, and Socket.io adapter → run N API instances.
3. **Split services:** extract realtime gateway and payments/ledger workers.
4. **Media scale:** Agora handles voice; add regional token servers + CDN for assets.
5. **Data:** read replicas, partition ledger/events, move analytics to a warehouse.

## Security & money integrity
- All wallet mutations run inside DB transactions with an append-only `Transaction` ledger.
- Server is the source of truth for coin/diamond balances — clients never set balances.
- Receipt verification (Apple/Google/Stripe) **before** crediting coins.
- JWT on both REST and sockets; per-endpoint rate limits; input validation (zod) at the edge.
