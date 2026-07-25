# El Kaptin — publishing checklist

Everything between "the code works" and "it's live on Google Play." Grouped by
who has to do it. The code-side items are done or scripted; the account /
review / payment items need you and can't be automated.

Legend: ✅ done · 🟡 ready, needs your action · ⬜ not started

---

## A · Product / code  (mostly done)

- ✅ Backend, dashboard, driver app feature-complete
- ✅ Automated tests: backend integration suite, dashboard e2e, driver-app APK build — all green in CI
- ✅ Privacy Policy + Terms pages (`/privacy`, `/terms`) — bilingual
- ✅ Background-location **prominent disclosure** shown before the permission prompt
- ✅ **Account & data deletion** — in-app (Settings → Danger zone) + `/delete-account` page + email
- ✅ Tracking page served from our own origin (no third-party CDN)
- 🟡 Signed release **AAB** — the build workflow is in place; add your upload keystore (see `RELEASE-SIGNING.md`)

## B · Prove it on real hardware  (needs you — the biggest unknown)

- 🟡 Run one full delivery on a real Android phone — see `PILOT-TEST.md`
- ⬜ Test on a budget device (Xiaomi/Realme/Samsung Go) with battery-optimisation on
- ⬜ Confirm background tracking survives screen-lock + app-switch for 20+ min

## C · Hosting  (needs you — an account with a payment method)

- ⬜ Stand up an always-on backend + managed Postgres with a stable domain + TLS
  (see `DEPLOY-*.md`). A Codespace is fine for the pilot test but not for a listing.
- ⬜ Set `CORS_ORIGIN`, a strong `JWT_SECRET`, and the production `DATABASE_URL`
- ⬜ Point the app's default `API_BASE`/`WS_BASE` at that domain (or set them per build)

## D · Google Play  (needs a Play Developer account — $25 one-time)

- ⬜ Create the Play Developer account
- 🟡 Store listing copy — drafted in `PLAY-LISTING.md` (title, descriptions, EN + AR)
- 🟡 **Data Safety** form — answers drafted in `DATA-SAFETY.md`
- ⬜ Privacy-policy URL field → your deployed `/privacy`
- ⬜ Data-deletion URL field → your deployed `/delete-account`
- ⬜ **Background location declaration** — the hard one: written justification, an
  in-app disclosure (done), and a short screen-recording of the flow. Google
  reviews this manually; expect **1–3+ weeks** and possible back-and-forth.
- ⬜ Content rating questionnaire, target audience (18+), ads declaration (no ads)
- ⬜ Upload the signed AAB to a **closed test** track first, then production

## E · Commercial  (only if charging from day one)

- ⬜ Real payment collection (currently manual Vodafone Cash / InstaPay references)
- ⬜ A short merchant onboarding / support contact

---

## The realistic critical path to "live"

1. **Phone test** (B) — turns the biggest unknown into a real answer.
2. **Hosting** (C) — a stable URL everything else points at.
3. **Play account + signed AAB** (D, A) — upload to a closed test track.
4. **Submit for background-location review** (D) — the calendar-bound gate.

Items A (code) are handled. The timeline is set by C, D, and Google's review —
not by more coding.
