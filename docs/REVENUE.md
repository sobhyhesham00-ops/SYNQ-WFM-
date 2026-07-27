# Aura — Monetization & Revenue Strategy

How Aura makes money, why it works, and the numbers to steer by. Aura runs a **hybrid
freemium + virtual-economy** model — the proven playbook of Wakie, Goodnight, Yalla, Bigo
Live, Litmatch, and MICO — layered on top of a deep **identity/recognition economy** that
turns social status into recurring spend.

---

## 1. The economic loop

```
        buys COINS (real $)                 sends GIFTS / buys COSMETICS
 User ─────────────────────►  Wallet  ─────────────────────────────────►  Creator/Host
   ▲                                                                          │
   │                                                                 receives DIAMONDS
   │  recognition, levels, leaderboards, bonds                                │
   └──────────────────────────  climbs status  ◄──────── cashes out (Aura keeps the spread)
```

- **Coins** = hard currency users buy (IAP/Play/Stripe).
- **Diamonds/Beans** = soft currency creators earn from received gifts.
- **Aura's margin** = (a) the coin→gift→diamond→payout **spread**, plus (b) pure-margin
  **cosmetic** and **subscription** sales, plus (c) **ads** on the free tier.

The recognition system is the flywheel: spending buys *visible status* (Wealth level,
frames, entrances, VIP, leaderboard rank), which creates social pressure to spend more.

---

## 2. Revenue streams (ranked by expected contribution)

### 2.1 Virtual gifting — **primary (~55–70% of revenue)**
- Users buy coins and send tiered gifts (Rose → Castle) to hosts, speakers, and matches.
- Creators receive diamonds; Aura keeps a **50–70% spread** on the coin→payout conversion.
- Amplifiers: gift combos/streaks, "gift rain", lucky/mystery gifts (coin sinks), room-wide
  broadcasts for big gifts, seat gift-counters, and **leaderboards** that reward top gifters.
- Why it works: emotional, social, competitive, and public. Whales drive a large share.

### 2.2 Coin top-up packs — the funnel into everything
- Tiered packs ($0.99 → $99.99+) with "best value" and first-purchase bonus.
- Dynamic offers: first-buy discount, flash sales, streak/whale-tier bonus coins.
- Mobile: **Apple IAP + Google Play Billing** (required). Web: **Stripe** + local rails
  (Fawry, M-Pesa, OXXO, GCash) for global reach and better margins.

### 2.3 Identity storefront (cosmetics) — **pure margin, high growth**
- Sell **frames, entrance effects/mounts, chat bubbles, nameplates, titles, profile themes,
  badges** for coins. No creator payout attached → near-100% margin.
- Self-reinforcing: the recognition system creates constant demand for the newest, rarest
  cosmetics (seasonal drops, limited editions, event-exclusive).

### 2.4 Aura+ / VIP (Noble) subscription — **predictable recurring revenue**
- Monthly/annual tiers (Baron → King). Perks: ad-free, unlimited random-chat rewinds/skips,
  "see who liked you", incognito/invisible join, profile boost credits, monthly coin
  stipend, exclusive cosmetics, gift discounts, priority matchmaking, extra room seats.
- Blends dating-app subscription (Tinder Gold-style) with audio-app VIP status.

### 2.5 Room & creator economy
- **Ticketed / paid rooms**, paid private rooms, "backstage" access.
- **Host revenue-share** and level-based bonuses to attract and retain talent (supply side).
- Agency/family programs: houses recruit hosts; Aura shares revenue with top families.

### 2.6 À-la-carte boosts
- **Profile Boost** (spotlight in discovery), **Super Like**, **room-list Spotlight** for
  hosts, **priority matchmaking**, **name-change / re-roll**, **incognito browse**.

### 2.7 Advertising — free tier only
- **Rewarded video**: "watch an ad → earn 20 coins" (monetizes non-payers, seeds first
  gift). **Native placements** in room lists / between random chats. Aura+ removes ads.

### 2.8 Future / secondary
- Brand-sponsored rooms & events, creator tipping in DMs, gifting during events/tournaments,
  regional payment-method arbitrage, data-safe advertising partnerships.

---

## 3. Pricing & currency design (illustrative)

| Item | Price | Notes |
| --- | --- | --- |
| Coin pack — Starter | $0.99 → ~100 coins | first-buy bonus +50% |
| Coin pack — Popular | $9.99 → ~1,100 coins | "best value" anchor |
| Coin pack — Whale | $99.99 → ~12,000 coins | bonus scaling for big spenders |
| Rose gift | 10 coins | entry gift, huge volume |
| Crown gift | 500 coins | mid-tier flex |
| Sports Car / Galaxy | 5,000–20,000 coins | broadcast + leaderboard mover |
| Avatar Frame (animated) | 500–5,000 coins/mo | rental or permanent |
| Entrance Effect (mount) | 2,000–20,000 coins | biggest flex, timed |
| Aura+ Baron / King | $4.99 / $49.99 mo | tiered perks |
| Profile Boost | 200 coins / $1.99 | 30-min spotlight |
| Diamond → payout | e.g. 10,000 diamonds ≈ $50 | after Aura spread + fees + KYC |

> Tune per market with **price localization** and PPP-aware packs — critical for global
> reach where a flat USD price would price out entire regions.

---

## 4. Unit economics — what to steer by

- **Payer conversion:** target **3–8% of MAU** (audio-gifting apps often exceed dating apps).
- **ARPPU** (avg revenue per *paying* user) and **ARPU** (per active user).
- **Whale concentration:** top 1–5% of payers often drive 50%+ of revenue → protect &
  reward them (VIP, exclusive cosmetics, dedicated support), but design so mid/low spenders
  also progress.
- **LTV : CAC ≥ 3:1** before scaling paid acquisition.
- **Gross margin:** cosmetics ~100%; gifting = the spread minus store fees (Apple/Google
  take 15–30% — factor into coin pricing and push web top-ups where allowed).
- **Take-rate on payouts:** the coin→diamond→cash spread is a core lever (typically 50–70%).

### Illustrative model (directional, not a forecast)
```
1,000,000 MAU
  × 5% payer conversion         =  50,000 payers
  × $15 ARPPU / month           = $750,000 gross monthly
  − ~25% store fees             ≈ $560,000 net
  − creator payouts / ops       →  contribution margin
+ ads on 950,000 non-payers     → incremental
```
Small conversion and ARPPU improvements compound hugely — the identity/recognition system
exists to move both.

---

## 5. Growth ↔ revenue levers (how they connect)

| Lever | Grows | Feeds revenue via |
| --- | --- | --- |
| Free random chat | top-of-funnel, DAU | more room-goers → more gifters |
| Recognition/levels | retention, session length | status pressure → cosmetics + gifts |
| Leaderboards & events | competition, spikes | gifting sprints, battle-pass |
| CP bonds & families | virality (invites), retention | mutual gifting, family spend |
| Host revenue-share | supply of live rooms | more rooms → more gifting surface |
| Localization & local pay | global reach | conversion in under-served markets |
| Push/re-engagement | DAU, return rate | more sessions → more spend |

---

## 6. Risks & mitigations
- **Store fees (15–30%)** → price coins accordingly; drive web top-ups where policy allows;
  lean on high-margin subscriptions/cosmetics.
- **Fraud / chargebacks / coin laundering** → KYC on payouts, ring detection, velocity
  limits, hold periods.
- **Whale dependence** → broaden mid-tier spend via cosmetics, battle-pass, families.
- **Trust & safety incidents** (a dating+voice app risk) → invest early; safety *is*
  growth insurance.
- **Regulatory** (gifting/"gambling"-like lucky draws, minors, data) → jurisdiction-aware
  design, cosmetic-only randomization, strict age gating.

---

## 7. Roll-out sequence (monetization)
1. **Coins + gifting + wallet** (the core loop) — see `backend/src/modules/{wallet,gifts}`.
2. **Identity storefront + levels** (cosmetics attach) — high margin, ship early.
3. **Aura+ / VIP** subscription.
4. **Creator payouts + KYC** (unlock supply-side incentives).
5. **Ads (rewarded)** on free tier.
6. **Events, battle-pass, families** (retention & spend spikes).

See [`docs/ROADMAP.md`](ROADMAP.md) for full sequencing.
