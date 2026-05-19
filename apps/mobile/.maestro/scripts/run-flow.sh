#!/bin/bash
# Maestro test entry point with automatic DB seeding.
#
# Reason this exists: Maestro's `runScript:` step only executes JavaScript
# inside a sandboxed GraalJS runtime with no shell / process exec / file
# I/O access. We need to run a `tsx` script that talks to Postgres to put
# the DB into a known-good state for every flow run, which the JS sandbox
# cannot do. The cleanest place to hook is here, around the maestro test
# invocation, mirroring the Playwright `globalSetup` / Jest `setupFiles`
# pattern.
#
# Usage:
#   apps/mobile/.maestro/scripts/run-flow.sh <flow-file-or-folder> [extra maestro args]
#
# Examples:
#   apps/mobile/.maestro/scripts/run-flow.sh apps/mobile/.maestro/B-returning-user-tabs-tour.yaml
#   apps/mobile/.maestro/scripts/run-flow.sh apps/mobile/.maestro -e APP_ID=app.pegada
#
# The seed step runs once at the top before maestro starts, so every flow
# in the suite starts from the same DB baseline (12 deck dogs near SF,
# magic user test@pegada.app with Rex, Rex<->Bella match + 2 chat
# messages, OTP=424242 on every test user).
#
# DATABASE_URL can be overridden in the environment (CI / docker-compose
# test DB); defaults to local dev Postgres on port 3356.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/seed-before-test.sh"

# Default env vars expected by the flow files. Callers can override.
export APP_ID="${APP_ID:-app.pegada}"
export APP_SCHEME="${APP_SCHEME:-pegada}"

exec maestro -e APP_ID="$APP_ID" -e APP_SCHEME="$APP_SCHEME" test "$@"
