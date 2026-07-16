#!/usr/bin/env bash
# One command to run the whole El Kaptin stack inside a GitHub Codespace and
# print the exact public URLs (and the values to build the phone APK with).
#
#   bash scripts/codespace-up.sh
#
# Then set port 8080 to PUBLIC in the Ports tab so your phone can reach it.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) Postgres (via the existing compose db service; docker-in-docker provides docker).
echo "==> starting Postgres…"
docker compose up -d db
for _ in $(seq 1 40); do
  if docker compose exec -T db pg_isready -U meshwar >/dev/null 2>&1; then break; fi
  sleep 1
done

export DATABASE_URL="postgresql://meshwar:meshwar@localhost:5432/meshwar?schema=public"
export JWT_SECRET="codespace-dev-secret"
export PORT=8080

# 2) schema + demo data (idempotent enough for a dev DB)
echo "==> preparing database + demo data…"
( cd backend && npx prisma db push --skip-generate && (npx tsx src/db/seed.ts || true) )

# 3) compute this Codespace's public URLs
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
NAME="${CODESPACE_NAME:-localhost}"
API="https://${NAME}-8080.${DOMAIN}"
WS="wss://${NAME}-8080.${DOMAIN}"
DASH="https://${NAME}-5173.${DOMAIN}"

cat <<BANNER

============================================================
  El Kaptin is starting up.

  Backend API : ${API}
  Dashboard   : ${DASH}

  >>> IMPORTANT: open the PORTS tab, right-click port 8080,
      Port Visibility -> Public   (so your phone can connect)

  Build the driver APK — GitHub -> Actions ->
  "Build driver APK" -> Run workflow — with:
      api_base = ${API}
      ws_base  = ${WS}

  Logins:  manager@demo.eg / password123   (dashboard)
           01000000001 / 1234              (driver app)
============================================================

BANNER

# 4) build the dashboard against this Codespace's backend URL, then run backend
#    (background) + serve the built dashboard (foreground). Building + `serve`
#    is more robust over Codespaces' forwarded ports than the Vite dev server.
echo "==> building dashboard…"
( cd dashboard && VITE_API_BASE="$API" VITE_WS_BASE="$WS" npm run build )

( cd backend && DATABASE_URL="$DATABASE_URL" JWT_SECRET="$JWT_SECRET" PORT=8080 npx tsx src/server.ts ) &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

echo "==> serving dashboard on :5173 (Ctrl-C stops everything)"
( cd dashboard && PORT=5173 npm run start )
