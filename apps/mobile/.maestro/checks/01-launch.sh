#!/usr/bin/env bash
# Post-check for flow 01 (launch.yaml): liveness via a FRESH maestro session.
#
# In-flow `assertVisible: id:` is unreliable right after launchApp on CI:
# the driver session that performed the clearState relaunch keeps serving
# a stale accessibility snapshot (maestro issue #3056) and never sees the
# new instance's RN ids — while any fresh session sees them immediately
# (verified twice from CI's own post-failure hierarchy dumps, runs
# 28621911520 and 28624965129). `maestro hierarchy` opens a fresh session,
# so this is the deterministic liveness probe: signin-email present means
# the JS bundle evaluated and SignIn mounted — catching every launch-crash
# class this gate has eaten (entitlements, env, styled-components DOM
# branch, Ads SDK abort).
set -euo pipefail

if maestro hierarchy 2>/dev/null | grep -q '"signin-email"'; then
  echo "[check-01] PASS - signin-email present in a fresh a11y snapshot (app is alive on SignIn)"
else
  echo "[check-01] FAIL - signin-email missing from the accessibility hierarchy." >&2
  echo "[check-01] Either the app crashed after launch (check crash-diagnostics) or the a11y unlock is not active in this build (EXPO_PUBLIC_MAESTRO_E2E)." >&2
  exit 1
fi
