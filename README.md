# Aura 🌙

**A global, audio-first social dating app.** No camera, just voice. Aura is where people
meet through *how they sound and what they say* — live audio rooms, free random voice/text
chats, a rich virtual-gifting economy, and a deep **identity & recognition system** that
makes every user instantly distinct. Think **Wakie / Goodnight**, fused with the status
economy of **Yalla / Bigo / MICO**, reimagined for a global audience with monetization
built in from day one.

> Platforms: **iOS + Android** (single React Native / Expo codebase) with a Node.js + Postgres backend.

---

## ✨ The core idea

Video dating is high-pressure and appearance-first. Voice is intimate, low-pressure, and
inclusive — you fall for a personality before a face. Aura leans all the way into audio,
then layers on a **status economy** so people don't just talk — they *belong, climb, and
get recognized*.

| Pillar | What it is |
| --- | --- |
| 🎙️ **Live Audio Rooms** | Camera-off group voice rooms ("Late Night", "Language Exchange", "Sing to Me"). A host + speakers on stage, unlimited listeners who can request the mic. |
| 🔀 **Free Random Chat** | One-tap matchmaking into a 1:1 voice or text chat with a stranger. Free and unlimited — the top of the funnel. |
| 🎁 **Virtual Gifts** | Animated gifts (Rose, Crown, Galaxy, Sports Car) sent to speakers and matches. Gifts cost **coins**; coins cost real money — the primary revenue engine. |
| 🪪 **Identity & Recognition** | Levels, badges, avatar frames, entrance effects, VIP tiers, titles, statuses & emojis — every user is visibly unique. |
| 🌍 **Language & Global** | Multi-language profiles, language-filtered rooms (include/exclude), and language-aware matchmaking + an "exchange" mode — built for a worldwide audience. |
| 💞 **Dating & Bonds** | Profiles, vibe tags, voice-intro bios, likes, matches, and public **CP/couple bonds** — audio社交 turns into real connection. |

Full spec: [`docs/PRODUCT.md`](docs/PRODUCT.md) · Monetization: [`docs/REVENUE.md`](docs/REVENUE.md)

---

## 🪪 Identity & Recognition — "recognize every user from the other"

The heart of Aura's stickiness and spend. Every user carries a stack of earned **and**
purchased signals so they're instantly distinct in any room or chat:

**Triple progression** — the "who matters here" engine:

| Track | Grows from | Signals |
| --- | --- | --- |
| ❤️ **Charm Level** | gifts *received* | popularity / desirability |
| 💎 **Wealth Level** | coins *spent* | status / generosity |
| ⭐ **Activity Level (XP)** | time in rooms, chats, streaks | loyalty / veteran status |

**Worn identity** (visible everywhere; most are sellable → deepens the economy):
- **Avatar Frames** — animated borders (Rose Gold, Dragon, Galaxy)
- **Entrance Effects** 🚗 — a ride/animation on room entry (*"Aura King entered in a Golden Phoenix"*)
- **Chat Bubble skins & Nameplate colors** — your messages stand out
- **Honor Titles / custom tags** — "Night Mayor", "Top Gifter", founder tags
- **Badges & Medals** — achievements, events, **verification** (✅ verified · 🎙️ host · 🛡️ mod)
- **VIP / Noble tiers** — Baron → Viscount → Duke → King, each with perks + flex

**Presence & personality:**
- **Status**: online / away / busy / invisible + **custom status line** + **mood emoji** 😴🔥🎧
- Vibe tags, country flag 🌍, languages spoken, voice-intro bio, streaks & daily check-in

**Social bonds** (viral + monetizable):
- **CP / Couple bonds** 💞 — publicly link two users with a rising heart level
- **Families / Guilds** — houses with their own badge, level, and leaderboard
- **Leaderboards** — Top Gifters, Top Charm, Rising Stars, weekly room rankings

Everything here is either a *reason to spend* (frames, entrances, VIP, mounts) or a *reason
to return* (levels, streaks, leaderboards, bonds). **Recognition is the product; gifting is
how you climb.**

---

## 💰 How Aura makes money (summary)

A **hybrid "freemium + virtual economy"** model — the model that makes Wakie, Goodnight,
Litmatch, Yalla, and Bigo Live profitable at global scale.

1. **Virtual gifting (primary, ~60–70% of revenue).** Buy coins → send gifts → creators
   receive diamonds → cash out. Aura keeps the spread (typically 50–70%).
2. **Coin/top-up packs.** Direct sale of in-app currency via Apple IAP, Google Play
   Billing, and (web) card/local wallets.
3. **Identity storefront.** Frames, entrance effects, bubbles, mounts, titles — cosmetics
   sold for coins. Pure-margin and self-reinforcing with the recognition system.
4. **Aura+ / VIP subscription.** Unlimited rewinds, "see who liked you", incognito join,
   boosts, exclusive gifts, ad-free — plus the Noble tiers.
5. **Room & creator economy.** Ticketed/paid rooms, host revenue-share to attract talent.
6. **Boosts & à-la-carte.** Profile boosts, Super Likes, room-list spotlight, priority match.
7. **Advertising (free tier only).** Rewarded video ("watch to earn coins") + native placements.

**North-star:** grow *payer conversion* (target 3–8% of MAU) and *ARPPU* while keeping the
free random-chat funnel wide. Details in [`docs/REVENUE.md`](docs/REVENUE.md).

---

## 🏗️ Architecture at a glance

```
┌─────────────────┐        REST + WebSocket        ┌──────────────────────┐
│   Mobile app    │  ←──────────────────────────→  │   Backend API        │
│ (Expo / RN, TS) │                                │ (Node, Express, TS)  │
│ Rooms · Chat    │        Realtime audio          │  ├─ Auth / JWT        │
│ Wallet · Gifts  │  ←──────  (Agora SDK)  ──────→  │  ├─ Rooms + signaling │
│ Identity · Bonds│                                │  ├─ Random matchmaker │
└─────────────────┘                                │  ├─ Gifts + wallet    │
        │                                          │  ├─ Identity/levels   │
        │ Apple IAP / Google Play / Stripe         │  └─ Socket.io gateway │
        ▼                                                       ▼
   App stores (coin purchases)                         PostgreSQL (Prisma)
```

Full write-up: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

- **`mobile/`** — Expo React Native app (iOS + Android).
- **`backend/`** — Express + TypeScript API, Prisma ORM (Postgres), Socket.io realtime.
- **`docs/`** — product, revenue, architecture, roadmap.

---

## 🚀 Quick start (local dev)

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill in secrets
npm install
npm run prisma:generate
npm run dev                    # API on http://localhost:4000

# 2. Mobile (second terminal)
cd mobile
npm install
npm start                      # Expo dev server — scan QR with Expo Go
```

Postgres via Docker: `docker compose up -d db`.

---

## 🔌 Third-party services you'll plug in

| Concern | Recommended provider | Why |
| --- | --- | --- |
| Live audio | **Agora** (or 100ms / LiveKit) | Low-latency global voice, generous free tier. |
| Coin purchases (mobile) | **Apple IAP + Google Play Billing** | Required for digital goods by store policy. |
| Payments (web / payouts) | **Stripe** (+ local rails: Fawry, M-Pesa) | Card + creator payouts globally. |
| Push notifications | **Expo Notifications / FCM / APNs** | Re-engagement (huge for retention). |
| Moderation | **Hive / AWS + human review** | Voice/text safety at global scale. |

Integrations sit behind clean interfaces (`backend/src/modules/*`) with `// TODO(provider)`
seams so real keys drop in without rewrites.

---

## 📍 Status

A **production-shaped MVP scaffold** — architecture, data model, core APIs, realtime
gateway, identity system, and mobile screens are in place with mock/in-memory
implementations where a paid SDK or store account is required. Meant to be run, demoed, and
iterated on — not shipped to stores unchanged. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## 📄 License

See [`LICENSE`](LICENSE).
