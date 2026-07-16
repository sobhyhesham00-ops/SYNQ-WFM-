#!/usr/bin/env bash
# Runs once when the Codespace is created: install deps + generate the Prisma
# client so the first `codespace-up.sh` is fast.
set -e
cd "$(dirname "$0")/.."

echo "==> installing backend deps"
(cd backend && npm install && npx prisma generate)

echo "==> installing dashboard deps"
(cd dashboard && npm install)

echo ""
echo "Setup done. Start everything with:"
echo "    bash scripts/codespace-up.sh"
