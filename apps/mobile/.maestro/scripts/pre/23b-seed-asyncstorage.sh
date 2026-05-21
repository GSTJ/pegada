#!/usr/bin/env bash
# Pre-test setup for flow 23b (lang-theme-persistence.yaml).
#
# WHY this exists: flow 23b proves that language and theme — both
# stored in AsyncStorage and gated by @gorhom/bottom-sheet pickers
# that crash the XCUITest driver on iOS 26 — survive a cold app
# launch. We cannot drive the pickers from Maestro, so we seed the
# AsyncStorage values OUT OF BAND by writing them directly into the
# app's manifest.json before the Maestro flow's cold-launch step.
#
# AsyncStorage on iOS RN stores small values inline in
#   <DataContainer>/Library/Application Support/<app.id>/RCTAsyncLocalStorage_V1/manifest.json
# as a single flat JSON object. Verified on iPhone 17 Pro Max
# iOS 26.4 with app.pegada — the manifest contains keys like
# {"token":"<jwt>","language":"en-US","theme":"dark", ...} where the
# StorageKeys enum maps to the lowercased key names (services/storage.ts).
#
# Sequence:
#   1. Make sure the app is fresh — boot sim if needed, terminate app,
#      and use a quick Maestro launch+login (login-returning) so the
#      auth router writes a valid JWT into AsyncStorage. Without this
#      JWT the cold-launched app would land on the sign-in screen, not
#      the tabs, and the language/theme assertions would test the
#      wrong rendered surface.
#   2. Terminate the app so it releases its file handles on the
#      manifest.
#   3. Use jq to merge the language + theme overrides into the manifest
#      (rather than overwriting — we need to keep the JWT token row).
#   4. Exit cleanly. The wrapper then invokes Maestro with the 23b
#      flow which `launchApp clearState=false` and asserts.
#
# Idempotent — safe to re-run between attempts. If the app data
# container or manifest doesn't exist yet (first run), step 1 creates
# them.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_ID="${APP_ID:-app.pegada}"

# -- 1. Fresh login so the AsyncStorage manifest exists with a valid JWT.
xcrun simctl terminate booted "$APP_ID" 2>/dev/null || true
sleep 1

# Tiny YAML that just clears state, logs in, and stops — enough to
# populate Library/Application Support/<app.id>/RCTAsyncLocalStorage_V1/manifest.json
# with the token + language fields, and to terminate so jq can write
# the file safely without the app overwriting our edits.
TMP_YAML="$(mktemp -t "23b-prep-XXXXXX.yaml")"
trap 'rm -f "$TMP_YAML"' EXIT
cat > "$TMP_YAML" <<YAML
appId: \${APP_ID}
---
- launchApp:
    clearState: true
    clearKeychain: true
- waitForAnimationToEnd
- runFlow: $MAESTRO_DIR/utils/login-returning.yaml
- waitForAnimationToEnd:
    timeout: 15000
- stopApp
YAML

echo "[pre-23b] running prep Maestro flow (login + stop)..."
maestro test -e APP_ID="$APP_ID" -e APP_SCHEME="${APP_SCHEME:-pegada}" "$TMP_YAML" >/dev/null

# -- 2. Locate the AsyncStorage manifest and patch language + theme.
CONTAINER="$(xcrun simctl get_app_container booted "$APP_ID" data)"
MANIFEST="$CONTAINER/Library/Application Support/$APP_ID/RCTAsyncLocalStorage_V1/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "[pre-23b] FATAL: manifest not found at $MANIFEST" >&2
  exit 1
fi

# Backup so debugging is possible if the patch goes wrong.
cp "$MANIFEST" "$MANIFEST.bak"

# StorageKeys.Language = "language", StorageKeys.Theme = "theme" — both
# stored as PLAIN STRINGS in the manifest (not JSON-encoded strings; the
# RCTAsyncLocalStorage backend stores the raw value as-is for short
# values that fit inline).
TMP_JSON="$(mktemp -t "23b-manifest-XXXXXX.json")"
trap 'rm -f "$TMP_YAML" "$TMP_JSON"' EXIT
jq '. + {"language":"pt-BR","theme":"dark"}' "$MANIFEST" > "$TMP_JSON"
mv "$TMP_JSON" "$MANIFEST"

echo "[pre-23b] patched manifest at $MANIFEST"
echo "[pre-23b] post-patch keys:"
jq -r 'keys | join(", ")' "$MANIFEST"
echo "[pre-23b] language=$(jq -r .language "$MANIFEST"), theme=$(jq -r .theme "$MANIFEST")"
