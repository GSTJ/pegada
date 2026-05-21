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
  # Try to derive a check script from a filename like .../NN-foo.yaml.
  if [[ "$FLOW_PATH" =~ ([0-9]+[a-z]?)-[^/]+\.yaml$ ]]; then
    DERIVED_PREFIX="${BASH_REMATCH[1]}"
    CHECK_MATCH=("$MAESTRO_DIR/checks/$DERIVED_PREFIX"-*.sh)
    if [[ -e "${CHECK_MATCH[0]}" ]]; then
      CHECK_SCRIPT="${CHECK_MATCH[0]}"
    fi
  fi
fi

# 3. Default env vars expected by the flow files. Callers can override.
export APP_ID="${APP_ID:-app.pegada}"
export APP_SCHEME="${APP_SCHEME:-pegada}"

echo ""
echo "==> maestro test $FLOW_PATH"
set +e
maestro test -e APP_ID="$APP_ID" -e APP_SCHEME="$APP_SCHEME" "$FLOW_PATH" "$@"
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
