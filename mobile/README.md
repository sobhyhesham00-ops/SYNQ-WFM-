# Aura — Mobile app

Expo + React Native + TypeScript. One codebase for **iOS + Android**.

## Run
```bash
npm install
npm start          # Expo dev server — scan the QR with Expo Go
# or: npm run ios / npm run android
```

Point the app at your backend by editing `expo.extra.apiUrl` in `app.json`
(defaults to `http://localhost:4000`). On a physical device use your machine's LAN IP.

## Screens
- **Auth** — register/login (captures primary language).
- **Rooms** — discover live audio rooms, filter by language, create a room.
- **Room** — camera-off seat grid, live gift FX, in-room chat, entrance effects.
- **Random Chat** — language-aware matchmaking (`same` / `exchange` modes).
- **Wallet** — coin balance, top-up packs, gift catalog.
- **Profile** — identity hub: charm/wealth/activity levels, status/mood, leaderboards.

## Real voice
Group voice attaches **react-native-agora** using the token returned by `POST /rooms/:id/join`.
That requires a dev/EAS build (not plain Expo Go). See `docs/ROADMAP.md`.

## Notes
- State via **Zustand** (`src/store/auth.ts`), REST via `src/api/client.ts`,
  realtime via `src/api/socket.ts`.
- Coin purchases in production go through Apple IAP / Google Play Billing with
  server-side receipt verification before `/wallet/topup`.
