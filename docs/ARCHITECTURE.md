# Meshwar — Driver Tracking SaaS · System Architecture

> B2B live-tracking + Cash-on-Delivery (COD) reconciliation for independent
> restaurants and takeaway chains running their own private fleets in Egypt.

---

## 1. System Architecture & Real-Time Strategy

### 1.1 The three moving parts

```
┌───────────────────────┐        ┌──────────────────────────────┐        ┌────────────────────────┐
│   DRIVER MOBILE APP    │        │           BACKEND            │        │   MANAGER DASHBOARD    │
│  (Flutter, Android/iOS)│        │ (Node.js + WS + PostgreSQL)  │        │   (React web, cashier) │
│                        │        │                              │        │                        │
│ Foreground service ───────WS──▶ │  /ws/driver  (ingest)        │        │                        │
│ GPS batched every 20s  │  (send)│      │                       │        │                        │
│                        │        │      ▼                       │        │                        │
│ Order status buttons ──────────▶│  REST /api/orders            │        │                        │
│                        │        │      │                       │        │                        │
│                        │        │      ▼ persist + fan-out     │        │                        │
│                        │        │  PostgreSQL (source of truth)│        │                        │
│                        │        │      │                       │        │                        │
│                        │        │      └──── WS /ws/dashboard ──────────▶│ Live map + COD drawer  │
│                        │        │            (broadcast)       │  (recv)│                        │
└───────────────────────┘        └──────────────────────────────┘        └────────────────────────┘
```

- **Driver app** is the *only* GPS source (hardware-free). It pushes location
  over a single persistent WebSocket and changes order state over REST.
- **Backend** is the source of truth. It ingests locations, throttles/persists
  them, and fans out live positions to any dashboards watching that restaurant.
- **Manager dashboard** subscribes to a room (`restaurant:{id}`) and renders a
  live map + the COD cash drawer.

### 1.2 Transport decision: WebSockets vs Firebase

| Concern | Raw WebSockets (chosen) | Firebase RTDB / Firestore |
|---|---|---|
| **Cost at MVP scale** | One small VM/container (e.g. Fly.io / Hetzner / Railway) runs WS + API + Postgres for ~$5–15/mo, flat. | Firestore bills **per document read/write**. Live tracking = a write every 20s per driver **and a read on every dashboard for every write**. 20 drivers × dashboards open all day silently burns the free tier and becomes the dominant cost. |
| **Egypt data usage** | Full control: batch N points per frame, gzip/permessage-deflate, binary payloads. Can drop to ~1 tiny frame / 20s. | SDK is chatty (auth refresh, metadata, listener overhead). Harder to squeeze on 3G. |
| **COD / money** | Postgres transactions + row locks give real ACID for cash reconciliation. | Firestore has transactions but aggregation & reporting on cash is awkward; you end up needing a SQL warehouse anyway. |
| **Offline buffering** | You implement a local queue in the app (shown in §3). More work, full control. | SDK handles offline persistence for free. |
| **Time to first demo** | ~1 day to a working socket. | ~2 hours; great for a throwaway prototype. |

**Recommendation for this MVP: raw WebSockets + PostgreSQL.**
The workload is *high-frequency, low-value* location writes plus *low-frequency,
high-value* money writes. Firestore's per-operation pricing is exactly wrong for
the first, and its weak aggregation is wrong for the second. A single small Node
process handles dozens of restaurants and hundreds of drivers before you need to
scale, and hosting stays a flat, predictable few dollars a month — which matters
for an Egypt-market price point.

> **When Firebase *does* win:** if you have zero backend engineers and want a
> 2-week pilot with one restaurant, Firestore + its offline SDK removes a lot of
> plumbing. The schema in `SCHEMA.md` includes a Firestore variant so you can
> start there and migrate the transport later — the app and dashboard talk to a
> thin `TrackingChannel` interface, not to the socket directly (see
> `mobile/flutter/lib/services/api_client.dart`).

### 1.3 Real-time data flow (the happy path)

1. Driver goes on shift → app starts a **foreground service** (visible
   notification) and opens `wss://api/ws/driver?token=…`.
2. Every 20s (or on ≥50 m movement) the service appends a `{lat,lng,ts}` sample
   to an in-memory ring buffer.
3. Every 20s a flush timer sends **one** WS frame containing the batched
   samples. If the socket is down, samples stay in a SQLite/Hive queue and flush
   on reconnect.
4. Backend receives the frame → writes the **latest** point to
   `drivers.current_lat/lng` (a cheap UPDATE) and appends all points to
   `location_logs` (a batched INSERT). It then broadcasts *only the latest
   point* to the `restaurant:{id}` dashboard room.
5. Order lifecycle (`Assigned → PickedUp → Delivered`) goes over REST so it's
   transactional; the resulting state change is also broadcast to the dashboard.
6. Dashboard renders driver pins + updates the COD drawer totals live.

### 1.4 Why "latest to dashboard, all to DB"

The dashboard only needs the *current* pin, so we broadcast a single small
object — cheap for the manager's browser and bandwidth. The history table gets
every batched point for the route replay / audit / dispute features later. This
split keeps both the wire and the manager's data usage minimal.

### 1.5 Scaling notes (post-MVP, not needed day one)

- Add Redis pub/sub between multiple Node instances so any instance can
  broadcast to any dashboard room.
- Move `location_logs` to a time-series partition (monthly) or TimescaleDB;
  it's the only table that grows without bound.
- Put the WS layer behind a load balancer that supports sticky sessions or
  token-routing.
