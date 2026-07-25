# Testing El Kaptin on a real phone (no paid hosting)

This runs the whole stack inside a **GitHub Codespace** and puts the driver app
on your Android phone — end to end, over the real internet, for free. Budget
~20 minutes the first time.

You need: this repo on GitHub, an Android phone, and a laptop with a browser.

---

## 1 · Start the backend in a Codespace

1. On GitHub, open the repo → green **`< > Code`** button → **Codespaces** tab →
   **Create codespace on main**. Wait for it to finish setting up (it installs
   deps automatically the first time).
2. In the Codespace terminal, run:

   ```bash
   bash scripts/codespace-up.sh
   ```

3. It prints a banner with two URLs — **copy them**, you'll need them in step 3:

   ```
   Backend API : https://<name>-8080.app.github.dev
   Dashboard   : https://<name>-5173.app.github.dev
   ```

## 2 · Make the backend reachable by your phone

GitHub forwards ports **privately** by default. Your phone can't reach a private
port, so flip 8080 to public:

1. In the Codespace, open the **PORTS** tab (next to the terminal).
2. Right-click **port 8080** → **Port Visibility** → **Public**.
   (The `🔒` icon turns into a `🌐`.)

> Leaving 5173 private is fine — you'll open the dashboard from your laptop,
> which is already signed in to the Codespace.

## 3 · Build the driver APK pointed at that backend

1. On GitHub: **Actions** → **Build driver APK** → **Run workflow**.
2. Fill in:
   - **api_base** = the `https://<name>-8080.app.github.dev` from step 1
   - **ws_base**  = the same host but `wss://…` (swap `https` → `wss`)
3. Run it. When it's green (~7 min), open the run → **Artifacts** →
   download **`el-kaptin-driver-apk`** and unzip it to get `app-release.apk`.

> The APK is debug-signed — perfect for sideloading a pilot. (A real keystore
> is only needed for a Play Store upload.)

## 4 · Install it on the phone

1. Send `app-release.apk` to the phone (email/Drive/USB) and tap it.
2. Android will ask to **allow installing unknown apps** — allow it for the app
   you're installing from (Files / Chrome), then install.

## 5 · Run one delivery end to end

**On the phone (driver):**
1. Open **El Kaptin**, sign in: phone **`01000000001`**, PIN **`1234`**.
2. Tap **Start shift**. Grant location — choose **Allow all the time** (this is
   what keeps GPS alive when the screen locks). Allow notifications too.

**On your laptop (manager):**
3. Open the **Dashboard** URL from step 1, sign in `manager@demo.eg` /
   `password123`.
4. Create an order, then **Assign** it to the driver (Ahmed / the seeded
   driver).

**Back on the phone:**
5. The new order appears (a snackbar pops within ~25s, or pull to refresh).
   Open it → **Navigate** → **Picked up** → enter the 4-digit code the manager
   sees → **Delivered**.

**What to watch (this is the real test):**
- The driver's dot **moves on the manager's live map** as you walk/drive.
- The **cash drawer** on the dashboard shows what the driver owes; **Received
  cash** settles it to zero.
- Lock the phone / switch apps for a few minutes — the persistent
  "El Kaptin — أنت متصل" notification stays, and the map keeps updating.
- Turn airplane mode on for a minute, then off — buffered fixes flush on
  reconnect (no gap in the trail once it catches up).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Phone can't log in / "network" error | Port 8080 isn't **Public** (step 2), or the APK was built with the wrong URL (rebuild step 3). |
| Driver dot never moves | Location permission isn't **Allow all the time**; or battery optimization is killing it — the app asks to disable it, say yes. |
| Map is blank grey | Tiles are blocked/slow on the network; the UI still works. Try Wi-Fi. |
| New order doesn't show | Wait 25s (auto-refresh) or pull to refresh; confirm it was **assigned** to *this* driver. |
| Codespace stopped | It suspends after ~30 min idle. Reopen it, re-run `codespace-up.sh`. If the `<name>` changed, rebuild the APK with the new URL. |

## Notes for a longer pilot

- The Codespace URL changes if the Codespace is recreated, which means
  rebuilding the APK. For a multi-day pilot with real merchants, move the
  backend to an always-on host (see `docs/DEPLOY-*.md`) so the URL is stable.
- Everything here uses **seed** logins. Create real drivers from the dashboard
  (Settings / onboarding) before handing it to an actual merchant.
