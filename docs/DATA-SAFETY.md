# Google Play — Data Safety form answers (driver app)

Fill these into Play Console → App content → **Data safety**. Answers reflect
what the driver app actually does. Keep them in sync with `/privacy` — Google
cross-checks the two.

## Does your app collect or share any of the required user data types?
**Yes** (collects; shares only with the merchant that employs the driver — see note).

## Data types

| Data type | Collected | Shared | Processed ephemerally? | Required/optional | Purpose |
|---|---|---|---|---|---|
| **Location — precise** | Yes | No¹ | No (stored) | Required | App functionality (live delivery tracking) |
| **Personal info — name** | Yes | No | No | Required | App functionality, account management |
| **Personal info — phone number** | Yes | No | No | Required | App functionality, account management |
| **App activity — other (orders, delivery status, cash amounts)** | Yes | No | No | Required | App functionality |

¹ "Shared" in Play's sense means transfer to a **third party**. A driver's data
is visible to the merchant that employs them (the account owner / data
controller), which Play treats as the same first-party service, not third-party
sharing. There is no sale or ad use.

## Key questions

- **Is all collected data encrypted in transit?** → **Yes** (HTTPS/WSS).
- **Do you provide a way to request that data be deleted?** → **Yes** —
  in-app (Settings → Danger zone) and at `<your-domain>/delete-account`.
- **Data collection is required (not optional)?** → Required; the app's purpose
  is tracking, which needs location, name and phone.
- **Is any data collected from children?** → No; the app is for businesses (18+).

## Purposes to select

- **App functionality** — for all types above.
- Do **not** select Analytics, Advertising/Marketing, Personalisation, Fraud
  prevention, or Account management unless it's genuinely used. (Name/phone can
  be marked "Account management" in addition to App functionality.)

## Location — extra care

Play flags precise + background location. Be ready with, in the **Permissions
declaration**:
- Why background location is needed: *"Drivers share live GPS with their own shop
  during active deliveries so the merchant can track orders and reconcile
  cash-on-delivery. Foreground service, persistent notification, only between
  Start shift and End shift."*
- The in-app prominent disclosure (already implemented) + a screen recording
  showing it appears **before** the permission request.
