# Dargak (درجك)

**Your shop, in your pocket — محلك في جيبك**

A modern, localized **micro-ERP & digital ledger** built with Flutter for small
Egyptian businesses: kiosks, local pharmacies, vegetable sellers
(*"El ragel bta3 el-5odar"*) and merchants running retail **Fawry / e-wallet**
terminals.

Dargak is **offline-first**, fully **bilingual (Egyptian Arabic ⇄ English)** with
proper RTL handling, and designed for busy hands — big buttons, big touch
targets, haptic confirmation on every save.

---

## ✨ Features

| # | Feature | Where |
|---|---------|-------|
| 1 | **Runtime AR/EN switch** with automatic RTL/LTR layout | `core/localization/`, `app.dart` |
| 2 | **Offline-first encrypted storage** (Hive + AES, keys in secure storage) | `data/hive/`, `data/repositories/` |
| 3 | **Financial dashboard** — daily / weekly / monthly, product vs service | `features/dashboard/` |
| 4 | **Dynamic InstaPay / e-wallet QR engine** (`https://ipn.eg/S/…` deep links) | `features/qr_payment/`, `core/services/payment_link_service.dart` |
| 5 | **InstaPay sharing hub** + **Fawry/wallet tracker** + **WhatsApp chasing engine** | `features/qr_payment/`, `features/fawry/`, `features/debts/` |
| 6 | **Accessibility** — large targets, haptics on save | `shared/widgets/`, `core/utils/haptics.dart` |
| 7 | **Monetisation** — freemium paywall (Route 1) + anonymized B2B schema (Route 2) | `features/paywall/`, `data/models/*` |

### The profit model

The dashboard cleanly separates **physical product turnover** from **service
revenue**, so the merchant sees their *pure* money:

```
Net Profit = (Sales − Cost of Stock − Bills) + Service Commissions
```

- **Sales** — product turnover
- **Cost of Stock** — wholesale stock expenses only
- **Bills** — rent, electricity, salaries, supplier & other expenses
- **Service Commissions** — the merchant's own profit on Fawry / wallet
  transactions (tracked as a *separate* revenue stream from the gross throughput)

Verified by unit tests in [`test/financial_summary_test.dart`](test/financial_summary_test.dart).

---

## 🏗️ Architecture

```
lib/
├── main.dart                     # bootstrap: Hive, intl, orientation
├── app.dart                      # MaterialApp, locale + theme + Directionality
├── core/
│   ├── theme/                    # AppColors, AppTheme (light/dark, Cairo font)
│   ├── localization/             # runtime AR/EN maps + delegate + context.l10n
│   ├── utils/                    # formatters (money/date), haptics
│   └── services/                 # payment links, WhatsApp, contacts, PDF
├── data/
│   ├── models/                   # Sale, Expense, Debt, FawryTransaction (+ enums)
│   ├── hive/                     # encrypted Hive bootstrap
│   └── repositories/             # CRUD + queries per entity
├── features/
│   ├── dashboard/                # summary engine + hero/breakdown cards
│   ├── sales/ expenses/ fawry/   # entry forms
│   ├── ledger/                   # tabbed history lists
│   ├── debts/                    # ledger + WhatsApp reminders
│   ├── qr_payment/               # Get-Paid QR engine
│   ├── paywall/                  # freemium gate + Pro sheet
│   ├── settings/                 # profile, payment details, language, PDF export
│   └── shell/                    # bottom-nav shell
└── shared/
    ├── providers/                # Riverpod: repos, settings, locale, summaries
    └── widgets/                  # AppCard, BigButton, ChoiceSelector, fields …
```

**Stack**

- **State management** — [Riverpod](https://riverpod.dev) (`StateNotifier` for
  settings, `Provider.family` for period summaries, a data-revision provider that
  recomputes on any box change).
- **Storage** — [Hive](https://docs.hivedb.dev) with **AES encryption**; the
  256-bit key is generated once and kept in the platform keystore via
  `flutter_secure_storage`. Manual `TypeAdapter`s (no codegen) keep the project
  buildable without `build_runner`.
- **Localization** — plain Dart string maps toggled at runtime (no rebuild), so a
  dialect reviewer edits copy in one file: `core/localization/app_strings.dart`.

---

## 💸 Payment engine (InstaPay & e-wallets)

`PaymentLinkService` encodes the merchant's **Instant Payment Address**
(`name@instapay`) or **wallet number** together with the requested amount into an
IPN deep link:

```
https://ipn.eg/S/<type>/<address>?type=…&addr=…&amount=…&cur=EGP&name=…
```

The **Get Paid** screen renders that link as a high-resolution `qr_flutter` QR.
When a customer scans it (InstaPay app or phone camera) it hands off to their
wallet/bank app with the beneficiary and amount pre-filled. The same screen
shares a copyable transfer text + link over WhatsApp.

> The `https://ipn.eg/S/…` structure and query parameters model InstaPay's
> shareable request links. Confirm the exact production payload with your
> acquirer / IPN onboarding and adjust `PaymentLinkService` accordingly — it is
> the single source of truth for the format.

---

## 💰 Monetisation

**Route 1 — Freemium.** `PremiumGate` caps the free tier at **40 active
customers** and gates **PDF reports**. Hitting a limit opens a localized
`PaywallSheet` targeting **50–100 EGP/month** with placeholder triggers for
**Fawry Pay-by-Link** and **Vodafone Cash** manual approval. Wire real activation
to your backend/webhook where `setPremium(true)` is called.

**Route 2 — B2B data foundation.** Sales and Fawry models expose
`toAnonymizedRecord()` which **strips all personal identity** (no customer
name/phone lives on a Sale) and emits only aggregate-friendly signals — product
category, quantity, unit price, coarse neighborhood, timestamp. This is the safe
foundation for macro FMCG market-trend analytics; it never exports names or phone
numbers.

---

## 🚀 Getting started

```bash
# 1. Generate native scaffolding (does not touch lib/ or pubspec)
flutter create --platforms=android,ios --org eg.dargak .

# 2. Apply the permission blocks in docs/NATIVE_SETUP.md

# 3. Install & run
flutter pub get
flutter run

# 4. Tests
flutter test
```

Requires Flutter ≥ 3.19 / Dart ≥ 3.3. See
[`docs/NATIVE_SETUP.md`](docs/NATIVE_SETUP.md) for Android/iOS permissions.

---

## 🔒 Privacy

- All financial data is stored **locally and encrypted**; nothing leaves the
  device unless the merchant explicitly shares (WhatsApp / PDF).
- The anonymized analytics export is **opt-in by design** and carries no PII.
