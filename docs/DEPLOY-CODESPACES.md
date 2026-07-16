# Run El Kaptin in a GitHub Codespace (no cloud account, no card)

This uses the GitHub account you already have. A Codespace is a cloud computer
GitHub gives you for free (a monthly allowance). We run the whole stack there —
Postgres + backend + dashboard — and expose the backend on a public URL your
phone can reach. Great for testing; the Codespace sleeps when you stop using it
(so it's not a 24/7 production server).

## 1. Open the Codespace

1. Go to the repo on GitHub → green **Code** button → **Codespaces** tab →
   **Create codespace on main**.
2. Wait ~2 minutes. It auto-installs everything (defined in `.devcontainer/`).
   You'll land in a VS Code editor in your browser.

## 2. Start everything (one command)

In the Codespace terminal:

```
bash scripts/codespace-up.sh
```

This starts Postgres, creates the tables, seeds demo data, and launches the
backend + dashboard. When it's up it prints a box with **your** URLs, e.g.:

```
Backend API : https://<your-codespace>-8080.app.github.dev
Dashboard   : https://<your-codespace>-5173.app.github.dev
```

Copy those — you'll need the backend one.

## 3. Make the backend public (so your phone can connect)

By default Codespace ports are private. Open the **PORTS** tab (bottom panel),
find port **8080**, right-click it → **Port Visibility → Public**. (Port 5173,
the dashboard, can stay private — you'll open it from this browser.)

## 4. Build the driver APK pointed at your backend

On GitHub → **Actions → "Build driver APK" → Run workflow**, and enter the URLs
the script printed:

- `api_base` = `https://<your-codespace>-8080.app.github.dev`
- `ws_base`  = `wss://<your-codespace>-8080.app.github.dev`

When it finishes, download the **`el-kaptin-driver-apk`** artifact and install it
on your Android phone (allow "install unknown apps").

## 5. Test it

- **Dashboard:** click the port-5173 URL (or the "open in browser" prompt) → log
  in with `manager@demo.eg` / `password123`.
- **Phone:** open El Kaptin → log in as driver `01000000001` / `1234` → grant
  location **"Allow all the time"** → **Start shift**.
- Watch the driver move on the dashboard map. 🚗

## Notes

- **The URL changes** if you delete the Codespace and make a new one. If that
  happens, re-run `scripts/codespace-up.sh`, re-set port 8080 to Public, and
  rebuild the APK with the new URL.
- **To stop:** press `Ctrl-C` in the terminal (stops backend + dashboard). The
  Codespace itself auto-stops when idle; your data persists until you delete it.
- **Free allowance:** GitHub gives a monthly Codespaces quota; stopping the
  Codespace when you're done keeps you inside it.
- This is for **testing**. For an always-on pilot, use Railway/Render/Fly (see
  `DEPLOY.md` / `docs/DEPLOY-RAILWAY.md`).
