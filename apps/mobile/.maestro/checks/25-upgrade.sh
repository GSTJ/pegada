#!/usr/bin/env bash
# Post-check for flow 25 (upgrade-journey.yaml).
#
# Verifies the upgrade flow's end-state in Postgres for
# test@pegada.app. In CI mock-mode (EXPO_PUBLIC_MAESTRO_E2E=1 build +
# MAESTRO_E2E=1 API) the purchase CTA tap routes to the
# `payment.maestroGrantPremium` mutation which calls
# PaymentService.createSubscription -> UPDATE "User" SET plan='PREMIUM'.
# A passing flow MUST leave the row at PREMIUM.
#
# === Outside CI mock-mode ===
# When the mobile bundle is built WITHOUT EXPO_PUBLIC_MAESTRO_E2E=1
# (e.g. local dev sim builds where the env was not exported at build
# time), the purchase CTA falls through to the real
# Purchases.purchasePackage path which raises "Simulator Detected" and
# never mutates state. The flow then ends with plan=FREE; this post-
# check correctly fails in that case so the missing build-env
# constraint surfaces loudly. Set MAESTRO_REQUIRE_PREMIUM=0 to relax
# the check when you only want to assert the upgrade-wall UI rendered.
#
# DATABASE_URL defaults to local dev Postgres on port 3356; override
# for CI.
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://tony:hawk@localhost:3356/pegada}"
TEST_EMAIL="${TEST_EMAIL:-test@pegada.app}"
MAESTRO_REQUIRE_PREMIUM="${MAESTRO_REQUIRE_PREMIUM:-1}"

PLAN=$(psql "$DATABASE_URL" -tA -c "
  SELECT plan FROM \"User\" WHERE email = '$TEST_EMAIL'
")

if [[ -z "$PLAN" ]]; then
  echo "[check-25] FAIL - no User row for $TEST_EMAIL (seed broken?)" >&2
  exit 1
fi

echo "[check-25] $TEST_EMAIL.plan = $PLAN"

if [[ "$MAESTRO_REQUIRE_PREMIUM" != "1" ]]; then
  echo "[check-25] WARN - MAESTRO_REQUIRE_PREMIUM=$MAESTRO_REQUIRE_PREMIUM, not asserting plan transition"
  exit 0
fi

if [[ "$PLAN" != "PREMIUM" ]]; then
  echo "[check-25] FAIL - expected PREMIUM, got $PLAN" >&2
  echo "[check-25] If this is a local dev build, confirm EXPO_PUBLIC_MAESTRO_E2E=1 was set at build time AND the API has MAESTRO_E2E=1 (see .github/workflows/e2e-mobile.yml for the CI env)." >&2
  echo "[check-25] To run the flow without asserting the mutation: MAESTRO_REQUIRE_PREMIUM=0 bash apps/mobile/.maestro/scripts/run-flow.sh 25" >&2
  exit 1
fi

echo "[check-25] PASS - $TEST_EMAIL upgraded to PREMIUM"
