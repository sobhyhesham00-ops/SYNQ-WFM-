# El Kaptin — Driver App (Flutter)

Background GPS tracking + COD cash-in-hand for a merchant's own drivers.
Egyptian Arabic (RTL) + English.

## Why there's no `android/` folder in git

This repo ships the **source** — `lib/`, `pubspec.yaml`, `assets/` — but not the
generated Android scaffold (Gradle wrapper, default resources), which is large,
binary, and tied to a specific Flutter version. You generate it on build with
one script, so it's always correct for whatever Flutter version you have.

## Build the APK

### Option A — In the cloud (no computer setup)

Push this repo to GitHub, then:

1. **Actions → "Build driver APK" → Run workflow.**
2. Enter your backend URLs (`https://…` and `wss://…`).
3. When the run finishes, open it and download the **`el-kaptin-driver-apk`**
   artifact. That `.apk` installs straight onto an Android phone.

Defined in [`.github/workflows/build-apk.yml`](../../.github/workflows/build-apk.yml).

### Option B — Locally (needs Flutter installed)

```bash
cd mobile/flutter
bash tool/prepare_android.sh          # scaffolds android/, wires permissions + icons
flutter build apk --release \
  --dart-define=API_BASE=https://YOUR-BACKEND \
  --dart-define=WS_BASE=wss://YOUR-BACKEND
```

The APK lands at `build/app/outputs/flutter-apk/app-release.apk`.

## Install on an Android phone

1. Copy the `.apk` to the phone (USB, or download the CI artifact on the phone).
2. Settings → allow **"Install unknown apps"** for your file manager/browser.
3. Tap the `.apk` → Install.
4. On first launch, grant **location "Allow all the time"** and let the
   persistent tracking notification stay up. See
   [`../../PILOT.md`](../../PILOT.md) for the per-OEM battery/autostart steps
   (critical on Xiaomi/Realme/Oppo/Samsung).

> iPhone: iOS can't sideload like Android — an iOS build needs an Apple
> Developer account + TestFlight. Android is the intended pilot platform.

## Configuration (`--dart-define`)

| Key        | Meaning                          | Default (prod)          |
|------------|----------------------------------|-------------------------|
| `API_BASE` | REST base URL                    | `https://api.meshwar.app` |
| `WS_BASE`  | WebSocket base URL for tracking  | `wss://api.meshwar.app`   |

Point both at your deployed backend (see [`../../DEPLOY.md`](../../DEPLOY.md)).

## Project layout

```
lib/
  main.dart                     app entry, RTL locale switch
  theme.dart  i18n.dart         brand theme + EN/AR strings
  screens/                      login, home, delivery (OTP), earnings
  services/
    api_client.dart             REST calls
    auth_store.dart             secure JWT storage
    location_service.dart       foreground-service GPS batching over WebSocket
tool/
  prepare_android.sh            regenerates + wires the android/ scaffold
  patch_manifest.py             injects permissions + the tracking service
assets/                         app icon + adaptive foreground
```
