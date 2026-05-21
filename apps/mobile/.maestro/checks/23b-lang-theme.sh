#!/usr/bin/env bash
# Post-check for flow 23b (lang-theme-persistence.yaml).
#
# Verifies the cold-launched app honored the AsyncStorage values that
# the pre-script (scripts/pre/23b-seed-asyncstorage.sh) seeded:
#
#   language = pt-BR    (StorageKeys.Language; read by i18n detector
#                        in apps/mobile/src/i18n.ts)
#   theme    = dark     (StorageKeys.Theme; read by ThemeProvider in
#                        apps/mobile/src/contexts/ThemeProvider.tsx)
#
# This proves end-to-end persistence: the seed values survive the cold
# launch and the app's storage layer reads + applies them on mount. A
# regression where the detector overwrites the language key (e.g. a
# misorder in cacheUserLanguage that fires before the user's choice is
# returned by detect) would show up as language=en-US in the manifest
# AFTER the Maestro flow ends.
#
# This script also tolerates the i18n detector re-writing the same
# value back into AsyncStorage on mount (cacheUserLanguage runs after
# detect for every successful load). What we strictly disallow:
#   - language not equal to "pt-BR"
#   - theme not equal to "dark"
#   - manifest missing entirely
#
# Returns exit 0 on PASS, non-zero on any miss with diagnostics to stderr.
set -euo pipefail

APP_ID="${APP_ID:-app.pegada}"
CONTAINER="$(xcrun simctl get_app_container booted "$APP_ID" data 2>/dev/null || true)"

if [[ -z "$CONTAINER" || ! -d "$CONTAINER" ]]; then
  echo "[check-23b] FAIL — no booted simulator with $APP_ID installed (CONTAINER='$CONTAINER')" >&2
  exit 1
fi

MANIFEST="$CONTAINER/Library/Application Support/$APP_ID/RCTAsyncLocalStorage_V1/manifest.json"
if [[ ! -f "$MANIFEST" ]]; then
  echo "[check-23b] FAIL — manifest not found at $MANIFEST (app never wrote AsyncStorage?)" >&2
  exit 1
fi

LANG_VAL=$(jq -r '.language // ""' "$MANIFEST")
THEME_VAL=$(jq -r '.theme // ""' "$MANIFEST")

echo "[check-23b] manifest path: $MANIFEST"
echo "[check-23b] language='$LANG_VAL', theme='$THEME_VAL'"

fail=0
if [[ "$LANG_VAL" != "pt-BR" ]]; then
  echo "[check-23b] FAIL — expected language='pt-BR', got '$LANG_VAL'" >&2
  fail=1
fi
if [[ "$THEME_VAL" != "dark" ]]; then
  echo "[check-23b] FAIL — expected theme='dark', got '$THEME_VAL'" >&2
  fail=1
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[check-23b] FAIL" >&2
  exit 1
fi
echo "[check-23b] PASS"
