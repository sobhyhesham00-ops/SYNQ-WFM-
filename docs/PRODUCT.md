# Aura — Product Specification

Aura is a **global, audio-first social + dating app**. It combines the low-pressure
intimacy of voice with the addictive **status economy** of live-audio giants (Yalla, Bigo,
MICO, Litmatch) and the matchmaking loop of dating apps. This document is the product
source of truth.

---

## 1. Positioning

> **"Fall for a voice, not a filter."**

- **Category:** Social discovery + dating, audio-first (camera-off by design).
- **Comparables:** Wakie, Goodnight (voice calls) · Yalla, Yoho, Bigo (audio rooms +
  gifting) · Litmatch, MICO (audio + dating) · Discord (rooms) · Tinder/Bumble (dating loop).
- **Aura's wedge:** the *recognition system* — Aura makes every user visibly unique and
  gives them ladders to climb, so social status (not just messaging) is the product.
- **Primary markets:** MENA, South & Southeast Asia, LATAM, and diaspora communities —
  regions where audio-room + gifting apps already dominate — expanding globally.

---

## 2. Personas

| Persona | Wants | Monetization role |
| --- | --- | --- |
| **The Listener / Newcomer** | company, low-pressure chat, entertainment | funnel top; converts to spender via first gift |
| **The Host / Creator** | audience, income, status | supply side; earns diamonds → payouts |
| **The Spender / "Whale"** | recognition, to impress, to win leaderboards | majority of revenue; buys coins + cosmetics + VIP |
| **The Dater** | real 1:1 connection | drives retention & word-of-mouth; buys boosts/Super Likes |

Healthy marketplace = enough **hosts** to fill rooms, enough **listeners** to fill seats,
and enough **spenders** to pay everyone (including Aura).

---

## 3. Core features

### 3.1 Live Audio Rooms 🎙️
- Camera-off group voice. Roles: **Host/Owner**, **Speakers** (on-stage seats, e.g. 8–12
  mic slots), **Listeners** (unlimited), **Moderators**.
- Seat management: request mic, invite to seat, mute, kick, lock seat, "boss seat".
- Room types: public, private (invite/password), **ticketed/paid**.
- Themes/categories: Dating & Mingle, Late Night, Music/Karaoke, Language Exchange, Games,
  Just Chatting. Discovery by trending, category, language, region, and *followed hosts*.
- In-room: text chat, emojis/animated emotes, **gift animations**, seat-level gift counters,
  background music, sound effects, mini-games (lucky draw, spin wheel — coin sinks).
- Realtime audio via **Agora** (token-based join); signaling/state via Socket.io.

### 3.2 Free Random Chat 🔀
- One tap → matched with a stranger for a **1:1 voice or text** chat. Free & unlimited.
- Filters (some free, some Aura+): gender, language, region, interests.
- Controls: skip/next, add friend, report, block, "extend/keep talking".
- Safety: profanity filter, voice moderation sampling, easy report, rate limits.
- Purpose: the widest top-of-funnel; converts strangers → friends → room-goers → spenders.

### 3.3 Virtual Gifts & Economy 🎁
- **Coins** = hard currency users buy. **Diamonds/Beans** = soft currency creators earn from
  received gifts and cash out. Aura keeps the spread.
- Gift catalog: tiered from cheap (Rose 🌹 10 coins) to premium (Sports Car 🏎️, Galaxy 🌌,
  Castle 🏰 — thousands of coins) with escalating animations.
- Combos & streaks (send x10, "gift rain"), lucky gifts (randomized payout — a coin sink),
  room-wide broadcast for big gifts ("X sent a Castle to Y!").
- Every gift feeds Charm (receiver) and Wealth (sender) levels + leaderboards.

### 3.4 Dating & Bonds 💞
- Profiles: display name, avatar, **voice-intro bio**, age, gender, country/flag, languages,
  vibe tags, interests, worn identity items.
- Discovery: swipe/like, "nearby" & "new", "who's live now", daily recommended.
- **Likes / Matches** → DMs. **Super Like** & **Boost** are paid.
- **CP / Couple Bonds** 💞: two users publicly link; a **heart/bond level** rises as they
  gift each other and spend time together — displayed on both profiles.

---

## 4. Identity & Recognition System 🪪 (the differentiator)

Goal: **every user is instantly recognizable and distinct**, and always has a next rung to
climb. This is both the retention loop and a major revenue surface.

### 4.1 Triple progression
| Track | Source | Display | Purpose |
| --- | --- | --- | --- |
| ❤️ **Charm** | gifts received | heart icon + level number | popularity/desirability |
| 💎 **Wealth** | coins spent | diamond icon + level number | status/generosity |
| ⭐ **Activity (XP)** | rooms, chats, streaks, quests | star icon + level number | loyalty/veteran |

Levels unlock cosmetics, perks, and higher leaderboard weight. Wealth & Charm are the
"flex" ladders spenders and hosts chase; Activity rewards everyone for showing up.

### 4.2 Worn / cosmetic identity (mostly sellable)
- **Avatar Frames** — static & animated borders (level-gated, VIP, event, or purchased).
- **Entrance Effects** 🚗 — full-screen animation + broadcast when entering a room
  (mounts/rides: Phoenix, Sports Car, Spaceship).
- **Chat Bubbles & Nameplates** — skinned message bubbles and colored name tags.
- **Honor Titles / Tags** — under-name labels ("Night Mayor", "Top 1 Gifter", founder tags).
- **Badges & Medals** — achievements, event trophies, seasonal, verification.
- **Profile themes** — background skins, music.

### 4.3 Verification & role badges
- ✅ **Verified** (identity/notable), 🎙️ **Host/Creator**, 🛡️ **Moderator**, 🛠️ **Staff**,
  🏆 event-winner badges. Instant trust + status signaling.

### 4.4 VIP / Noble tiers
- Subscription/threshold tiers: **Baron → Viscount → Earl → Duke → King**.
- Perks: exclusive frames/entrances, invisible/incognito join, extra room seats, gift
  discounts, priority matchmaking, "who liked you", monthly coin stipend, gold nameplate.

### 4.5 Presence & personality
- **Status**: online / away / busy / invisible (+ auto-away).
- **Custom status line** ("looking for late-night chat") + **mood emoji** 😴🔥🎧💔🎉.
- Country flag 🌍, languages spoken, vibe tags, streak counter, "last active".

### 4.6 Social graph & competition
- **Families / Guilds / Houses** — join or found a house with its own name, badge, level
  (from members' activity), treasury, and family-vs-family leaderboards & wars.
- **Leaderboards** — Top Gifters, Top Charm, Rising Stars, Room of the Week, Family ranks;
  daily/weekly/monthly, global & regional. The recurring reason to spend.
- **Follow/friends**, online friends list, "notify when host goes live".

### 4.7 Gamification
- Daily check-in streaks, quests/tasks (send a gift, join 3 rooms → coins/XP), lucky
  spin/wheel, seasonal events & battle-pass ("Aura Pass") with cosmetic tracks.

---

## 5. Language & Global Connection 🌍 (built for a worldwide audience)

Aura is global-first, so **language is a core matching and discovery dimension**, not a
setting buried in options. It lets people connect within their language *or* deliberately
across languages (language exchange / practice), and lets rooms curate who can join.

### 5.1 Language on the profile
- Users pick **spoken languages** with a **proficiency** each (Native / Fluent / Learning)
  and a **preferred/primary** language.
- Optional **"open to language exchange"** flag + the languages they *want to learn*.
- Languages render as flag/label chips on the profile and next to the name in rooms.

### 5.2 App language vs. connection language
- **App/UI language** (localization of the interface — separate concern, i18n) is chosen
  independently from **connection languages** (who you want to talk to).
- Full **i18n**: UI strings externalized, RTL support (Arabic/Hebrew), locale-aware
  dates/numbers, and **PPP-aware pricing** per region (see REVENUE.md).

### 5.3 Room language controls
- Each room has a **primary language** + optional **allowed languages** list.
- **Include / exclude filters:** a host can **restrict** a room to specific languages
  (e.g. "Spanish only") or **exclude** languages; discovery hides rooms whose language you
  don't match unless you opt into "show all languages".
- Rooms are **tagged and filterable by language** in discovery, alongside category/region.
- Optional **"language-locked" join rule**: users whose profile languages don't intersect
  the room's allowed set are blocked from taking a mic seat (still may listen, if allowed).

### 5.4 Language-aware matchmaking (random chat)
- Default: match users who **share at least one language** (best conversation quality).
- **Cross-language / "Exchange" mode:** opt in to be matched with someone learning *your*
  language while you learn *theirs* — great for growth in language-learning communities.
- Filters (some free, some Aura+): "same language only", "let me pick languages",
  "exclude languages", region/timezone bias.
- The matcher scores candidates on language overlap first, then interests/region.

### 5.5 Cross-language assist (roadmap)
- Optional **real-time text translation** in chat and room text (send in one language, read
  in another) and **auto-translated captions** — a strong global differentiator and a
  potential Aura+ perk. Marked as a Phase-3+ enhancement.

### 5.6 Data & implementation
- `Profile.languages` (with proficiency) + `Profile.learningLanguages` + `primaryLanguage`.
- `Room.primaryLanguage` + `Room.allowedLanguages[]` + `Room.excludedLanguages[]`.
- Matchmaking queue keyed partly by language; see `backend/src/modules/chat`.

## 6. Safety, Trust & Compliance (non-negotiable for a global dating app)

- Age gate (18+), age assurance where required.
- Realtime + async moderation: text profanity filter, voice sampling/AI moderation, image
  scanning on avatars; report/block everywhere; rate limiting on random chat.
- Anti-fraud: device fingerprinting, chargeback handling, coin-laundering detection
  (gift→payout ring detection), payout KYC for creators.
- Privacy: GDPR/CCPA data rights, regional data handling, clear consent, minimal PII.
- Store compliance: digital goods via IAP/Play Billing only on mobile; content guidelines;
  no circumventing store billing for coins.
- Trust & Safety ops: escalation queues, ban/appeal flows, moderator tooling.

---

## 7. Non-goals (v1)
- No video/camera streaming (audio-first is the brand). Revisit later as optional.
- No open web marketplace for coins (store-billing compliance).
- No crypto/real-money gambling (lucky gifts stay cosmetic, jurisdiction-aware).

---

## 8. Success metrics
- **Acquisition:** installs, CAC, invite virality (K-factor from CP/family invites).
- **Engagement:** DAU/MAU, avg room time, rooms joined, random chats/day, D1/D7/D30 retention.
- **Marketplace:** live rooms/day, host earnings, listener→speaker rate.
- **Monetization:** payer conversion %, ARPPU, ARPU, coin-pack purchase rate, subscription
  take-rate, gifting volume, cosmetic attach rate, whale concentration.
- **Health/Safety:** report rate, ban rate, chargeback %, moderation SLA.

See [`docs/REVENUE.md`](REVENUE.md) for the full monetization model and
[`docs/ROADMAP.md`](ROADMAP.md) for sequencing.
