# Aura — Roadmap

From this MVP scaffold to a launchable global product. Phases are outcome-based, not dates.

## Phase 0 — Foundation ✅ (this scaffold)
- Monorepo, backend API skeleton (auth, users, rooms, chat, gifts, wallet, identity),
  Prisma data model, Socket.io realtime contract, Expo mobile app with core screens,
  product + revenue + architecture docs.

## Phase 1 — Core loop (MVP alpha)
- Real auth (phone/email OTP + social login).
- Live audio rooms on **Agora** (token issuance done server-side): seats, roles, mute/kick.
- Free random text chat end-to-end; then random **voice** chat.
- Wallet + coins + basic gift catalog + send-gift transaction (in-app test currency).
- Profiles with status, mood emoji, vibe tags, voice-intro bio.
- Basic moderation: report/block, profanity filter, rate limits.

## Phase 2 — Money on
- **Apple IAP + Google Play Billing** for coin packs with server-side receipt verification.
- Diamonds + creator earnings ledger (payouts stubbed).
- **Identity storefront**: frames, entrance effects, bubbles, titles; worn load-out rendering.
- Charm / Wealth / Activity levels wired to gifts, spend, and activity.
- Leaderboards (top gifters / charm, room rankings).

## Phase 3 — Retention & status economy
- **Aura+ / VIP (Noble) tiers** + subscription billing.
- Daily check-in, quests, lucky spin, **battle-pass (Aura Pass)**.
- **CP / couple bonds** and **families/guilds** with leaderboards.
- Push notifications & re-engagement (host-live, new likes, gift received).
- Verification & role badges.

## Phase 4 — Scale & safety
- Redis (presence, matchmaking, Socket.io adapter) → horizontal scale.
- Voice/text AI moderation at volume; T&S tooling, appeal flows, KYC for payouts,
  fraud/chargeback/coin-laundering defenses.
- Localization (languages, PPP-aware pricing, local payment rails: Fawry, M-Pesa, GCash…).
- Observability: metrics, tracing, analytics warehouse, experimentation/AB framework.

## Phase 5 — Growth
- Creator/agency (family) revenue-share programs to grow live-room supply.
- Referral & invite virality (CP/family invites), sponsored rooms & events.
- Paid acquisition once LTV:CAC ≥ 3:1; regional market expansion.

---

## Engineering backlog seams already marked in code
- `// TODO(provider: agora)` — real audio token + client join.
- `// TODO(provider: iap)` — Apple/Google receipt verification before crediting coins.
- `// TODO(provider: stripe)` — web top-ups + creator payouts.
- `// TODO(scale: redis)` — move presence/matchmaking/pubsub off in-memory maps.
- `// TODO(safety)` — moderation hooks on chat/voice/report.

## Definition of "launch-ready"
- Core loop stable at target concurrency; payments live & reconciled; T&S + moderation
  staffed and tooled; store compliance passed (iOS review + Play review); localized for
  launch markets; analytics + on-call in place.
