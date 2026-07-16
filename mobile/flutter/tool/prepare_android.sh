#!/usr/bin/env bash
#
# Turns the source-only Flutter app into a buildable Android project.
#
# The repo intentionally ships lib/ + pubspec + assets only — NOT the generated
# android/ scaffold (Gradle wrapper jar, default resources, etc.), which is
# large, binary, and version-specific. This script regenerates that scaffold
# with `flutter create`, then overlays THIS app's Android specifics:
#   - foreground-service + location + notification permissions (Blueprint §3)
#   - the flutter_background_service "location" service declaration
#   - the "El Kaptin" launcher label + adaptive icons
#
# Run it once on any machine (or in CI) that has Flutter installed, then
# `flutter build apk`. Safe to re-run — it's idempotent.
#
# Usage:  bash tool/prepare_android.sh
set -euo pipefail

cd "$(dirname "$0")/.."   # -> mobile/flutter
ROOT="$(pwd)"
MANIFEST="android/app/src/main/AndroidManifest.xml"

echo "==> flutter create (android platform scaffold)"
# No --overwrite: this ADDS the android/ platform and leaves our lib/, pubspec,
# and assets untouched. `flutter create` skips files that already exist.
flutter create \
  --platforms=android \
  --org com.elkaptin \
  --project-name meshwar_driver \
  .

echo "==> flutter pub get"
flutter pub get

echo "==> overlaying El Kaptin permissions + foreground service into $MANIFEST"
python3 tool/patch_manifest.py "$MANIFEST"

echo "==> generating launcher icons"
dart run flutter_launcher_icons

echo ""
echo "Android project is ready. Build with e.g.:"
echo "  flutter build apk --release \\"
echo "    --dart-define=API_BASE=https://YOUR-BACKEND \\"
echo "    --dart-define=WS_BASE=wss://YOUR-BACKEND"
