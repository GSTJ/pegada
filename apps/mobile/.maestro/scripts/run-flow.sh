#!/bin/bash
# Maestro test entry point with automatic DB seeding + post-flow DB check.
#
# Reason this exists: Maestro's `runScript:` step only executes JavaScript
# inside a sandboxed GraalJS runtime with no shell / process exec / file
# I/O access. We need to run a `tsx` script that talks to Postgres to put
# the DB into a known-good state for every flow run, AND a post-flow
# psql script that verifies the flow's side effects actually hit the DB.
# Neither can run inside the Maestro YAML, so we wrap it.
#
# Usage:
#   apps/mobile/.maestro/scripts/run-flow.sh <flow-num|file-or-folder> [extra maestro args]
#
# Examples:
#   apps/mobile/.maestro/scripts/run-flow.sh 26
#   apps/mobile/.maestro/scripts/run-flow.sh apps/mobile/.maestro/26-logout-journey.yaml
#   apps/mobile/.maestro/scripts/run-flow.sh apps/mobile/.maestro
#
# When a numeric flow id is passed (e.g. `26`, `23b`), the wrapper resolves
# it to `apps/mobile/.maestro/<NN>-*.yaml` and, after `maestro test` exits
# 0, runs the matching `apps/mobile/.maestro/checks/<NN>-*.sh` if present.
# The wrapper exits non-zero unless BOTH the maestro flow AND the DB check
# pass — that's the whole point of the post-check: state-changing flows
# must prove the state actually changed.
#
# DATABASE_URL can be overridden in the environment (CI / docker-compose
# test DB); defaults to local dev Postgres on port 3356.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 1. Always seed first — idempotent.
"$SCRIPT_DIR/seed-before-test.sh"

# 1b. Optional per-flow pre-test setup (e.g. inject AsyncStorage values
# for flow 23b). Looked up by the same prefix convention as the post-
# check (`pre/<NN>-*.sh`). Runs ONLY when the wrapper resolves a numeric
# flow id; explicit-path invocations skip it.

# 2. Resolve the flow argument. Numeric (with optional single-letter
# suffix like 23b) => look up by prefix; everything else is treated as a
# direct path / folder for maestro.
RAW_ARG="${1:-apps/mobile/.maestro/}"

FLOW_PATH=""
CHECK_SCRIPT=""

if [[ "$RAW_ARG" =~ ^[0-9]+[a-z]?$ ]]; then
  PREFIX="$RAW_ARG"
  # Pad bare single-digit numerics to 2 digits to match the filename
  # convention (`08-foo.yaml`).
  if [[ "$PREFIX" =~ ^[0-9]$ ]]; then
    PREFIX="0$PREFIX"
  fi
  MATCH_GLOB=("$MAESTRO_DIR/$PREFIX"-*.yaml)
  if [[ ! -e "${MATCH_GLOB[0]}" ]]; then
    echo "run-flow.sh: no flow matches prefix $PREFIX in $MAESTRO_DIR" >&2
    exit 2
  fi
  FLOW_PATH="${MATCH_GLOB[0]}"
  CHECK_MATCH=("$MAESTRO_DIR/checks/$PREFIX"-*.sh)
  if [[ -e "${CHECK_MATCH[0]}" ]]; then
    CHECK_SCRIPT="${CHECK_MATCH[0]}"
  fi
  PRE_MATCH=("$SCRIPT_DIR/pre/$PREFIX"-*.sh)
  if [[ -e "${PRE_MATCH[0]}" ]]; then
    echo ""
    echo "==> running pre-test setup: ${PRE_MATCH[0]}"
    bash "${PRE_MATCH[0]}"
    echo "==> pre-test setup OK"
  fi
  shift
else
  FLOW_PATH="$RAW_ARG"
  shift || true
  # Derive pre/check scripts from a filename like .../NN-foo.yaml — the
  # path form must behave exactly like the numeric-prefix form, or flows
  # invoked by path (CI's extended job, local suite loops) silently skip
  # their pre-test setup (23b's AsyncStorage seed, 25's plan reset, 27's
  # delete-me reseed) and fail on stale state.
  if [[ "$FLOW_PATH" =~ ([0-9]+[a-z]?)-[^/]+\.yaml$ ]]; then
    DERIVED_PREFIX="${BASH_REMATCH[1]}"
    CHECK_MATCH=("$MAESTRO_DIR/checks/$DERIVED_PREFIX"-*.sh)
    if [[ -e "${CHECK_MATCH[0]}" ]]; then
      CHECK_SCRIPT="${CHECK_MATCH[0]}"
    fi
    PRE_MATCH=("$SCRIPT_DIR/pre/$DERIVED_PREFIX"-*.sh)
    if [[ -e "${PRE_MATCH[0]}" ]]; then
      echo ""
      echo "==> running pre-test setup: ${PRE_MATCH[0]}"
      bash "${PRE_MATCH[0]}"
      echo "==> pre-test setup OK"
    fi
  fi
fi

# 3. Default env vars expected by the flow files. Callers can override.
export APP_ID="${APP_ID:-app.pegada}"
export APP_SCHEME="${APP_SCHEME:-pegada}"

# 3a. Flows 46/47 (deep-link sign-in hand-off) need a real dog id, resolved
# at run time by their pre-hook (pre/46-resolve-dog-id.sh) since it's a
# cuid2 assigned at seed insert time, not a constant. The pre-hook runs in
# its own subshell above, so it can't export DOG_ID back into this shell —
# it drops it in a cache file instead, which is read here if present.
# Harmless for every other flow: an unused `-e` var is a no-op for Maestro.
MAESTRO_DOG_ID_CACHE="${TMPDIR:-/tmp}/pegada-maestro-dog-id"
if [[ -z "${DOG_ID:-}" && -f "$MAESTRO_DOG_ID_CACHE" ]]; then
  DOG_ID="$(cat "$MAESTRO_DOG_ID_CACHE")"
fi
export DOG_ID="${DOG_ID:-}"

# 3b. Name the device, don't let anything downstream infer it.
#
# This wrapper is the iOS one. Its Android counterpart already exports
# MAESTRO_PLATFORM/MAESTRO_DEVICE_ID, and post-checks now refuse to measure
# anything when the environment could describe either platform — which it can,
# because the harness env sets SIM_UDID and ANDROID_SERIAL together. Declaring
# them here keeps `maestro test`, `simctl` and the post-check pointed at one
# device instead of three independent guesses at "booted".
export MAESTRO_PLATFORM="${MAESTRO_PLATFORM:-ios}"

if [[ -z "${MAESTRO_DEVICE_ID:-}" && "$MAESTRO_PLATFORM" == "ios" ]] \
  && command -v xcrun >/dev/null 2>&1; then
  BOOTED=$(xcrun simctl list devices booted --json 2>/dev/null \
    | grep -o '"udid" : "[^"]*"' | sed 's/.*: "//;s/"//' || true)
  if [[ "$(printf '%s\n' "$BOOTED" | grep -c .)" == "1" ]]; then
    export MAESTRO_DEVICE_ID="$BOOTED"
  fi
fi
export SIM_UDID="${SIM_UDID:-${MAESTRO_DEVICE_ID:-}}"

MAESTRO_DEVICE_ARGS=()
if [[ -n "${MAESTRO_DEVICE_ID:-}" ]]; then
  MAESTRO_DEVICE_ARGS=(--device "$MAESTRO_DEVICE_ID")
  # Report the platform we are actually on. This said "(ios)" unconditionally,
  # which was true of every caller until flow 50 ran on an emulator.
  echo "==> device: $MAESTRO_DEVICE_ID ($MAESTRO_PLATFORM)"
fi

# 3c. Pin the device's GPS to San Francisco — the maestro seed places all deck
# dogs near SF, and without a simulated location `getCurrentPositionAsync`
# never resolves, so AskForLocation hangs forever even with the permission
# pre-granted.
#
# The Android half also opens the port forwards the app needs, because there is
# nowhere else for them to live: EXPO_PUBLIC_API_URL is baked into the bundle
# as `http://localhost:<PORT>/api`, so the device's own localhost has to be the
# host's, and the same goes for MinIO on 9002 or every photo upload fails. On
# iOS the simulator shares the host's network stack and none of this is needed.
if [[ "$MAESTRO_PLATFORM" == "android" ]]; then
  ANDROID_TARGET_ARGS=()
  [[ -n "${MAESTRO_DEVICE_ID:-}" ]] && ANDROID_TARGET_ARGS=(-s "$MAESTRO_DEVICE_ID")
  if command -v adb >/dev/null 2>&1; then
    adb "${ANDROID_TARGET_ARGS[@]}" reverse "tcp:${PORT:-3010}" "tcp:${PORT:-3010}" >/dev/null 2>&1 || true
    adb "${ANDROID_TARGET_ARGS[@]}" reverse tcp:9002 tcp:9002 >/dev/null 2>&1 || true
    adb "${ANDROID_TARGET_ARGS[@]}" emu geo fix -122.4194 37.7749 >/dev/null 2>&1 || true
  fi
elif command -v xcrun >/dev/null 2>&1; then
  xcrun simctl location "${MAESTRO_DEVICE_ID:-booted}" set 37.7749,-122.4194 \
    2>/dev/null || true
fi

echo ""
echo "==> maestro test $FLOW_PATH"
set +e
maestro "${MAESTRO_DEVICE_ARGS[@]}" test \
  -e APP_ID="$APP_ID" -e APP_SCHEME="$APP_SCHEME" -e DOG_ID="$DOG_ID" \
  "$FLOW_PATH" "$@"
MAESTRO_RC=$?
set -e

if [[ "$MAESTRO_RC" -ne 0 ]]; then
  echo ""
  echo "==> maestro test FAILED with exit code $MAESTRO_RC"
  exit "$MAESTRO_RC"
fi

# 4. Run DB post-check if present. State-changing flows MUST have one;
# read-only flows (e.g. lang/theme persistence verified via screenshot)
# legitimately have no check script — we don't fail on missing checks
# but we do log so the absence is visible.
if [[ -n "$CHECK_SCRIPT" ]]; then
  echo ""
  echo "==> running DB post-check: $CHECK_SCRIPT"
  bash "$CHECK_SCRIPT"
  echo "==> DB post-check PASSED"
else
  echo ""
  echo "==> no DB post-check script found for this flow (ok for read-only flows)"
fi
