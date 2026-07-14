# Egypt market & culture study — what Meshwar is built around

This drives concrete product decisions, not just positioning. Each insight below
maps to something in the codebase.

## Who we serve

Any small Egyptian merchant that runs its **own** couriers — not aggregator
fleets: **restaurants, takeaways (طلبات جاهزة), pharmacies (صيدليات), groceries
(بقالة), mini-markets, and the street kiosk (كشك)** — plus a catch-all "store"
for anything else. In Egypt these merchants:

- Deliver on **motorbikes / tuk-tuks**, drivers are commonly called *tayareen*.
- Live and die on **Cash on Delivery**. Card penetration is low; the driver
  comes back with a pocket of cash that must reconcile to the till.
- Coordinate almost everything by **phone call + WhatsApp**, not email/apps.

## Insights → build decisions

| Insight (market / culture) | What we built |
|---|---|
| **Addresses are landmark-based**, not street-precise. People say "over the pharmacy, next to the mosque" (فوق الصيدلية، جنب الجامع). | Orders carry a **`landmark`** field and prominent **`customerPhone`**; the map is an aid, the phone call is the real navigation. |
| **The driver calls the customer** on almost every delivery. | One-tap **Call** (`tel:`) and **WhatsApp** actions on the order + tracking page. |
| **Arabic-first users.** Many cashiers and most drivers are more comfortable in **Egyptian colloquial Arabic**, and the UI must run **right-to-left**. | Full **bilingual EN / Egyptian-Arabic** with RTL, colloquial (not formal MSA) copy, and a language toggle. Arabic is a first-class default, not a translation afterthought. |
| **COD accountability** is the #1 owner anxiety — "how much is with the driver right now?" The word owners use is *ohda* (عُهدة). | Cash-drawer reconciliation, per-driver **in-hand** totals, atomic settle, and a driver "my cash / العهدة" screen. |
| **Pharmacies have real constraints**: a delivery may need a **prescription (روشتة)**, some items are sensitive, and customers expect discretion. | Pharmacy orders support a **`requiresPrescription`** flag; the tracking page reads "your order" (never itemized meds) to preserve privacy. |
| **Vertical shapes vocabulary.** A "restaurant" label alienates a pharmacy owner. | A **`businessType`** (Restaurant / Takeaway / Pharmacy) drives the UI's words — "kitchen" vs "counter", "Preparing" vs "Getting your order ready". |
| **Budget Android phones** kill background apps aggressively. | Foreground-service tracking with OEM auto-start guidance (see `mobile/`). |
| **Data is costly on the road.** | Batched, movement-filtered location updates. |
| **WhatsApp is the sharing channel.** | Customer tracking link is designed to be pasted into WhatsApp; share buttons target it. |

## Explicitly out of scope for MVP (deliberate)

- In-app card payment — COD dominates; adding a gateway now is wasted effort.
- Itemized medicine catalogs / e-prescriptions — regulatory weight the MVP
  doesn't need; we only flag *that* a prescription is required.
- Multi-language beyond EN/AR — the two that matter here.
