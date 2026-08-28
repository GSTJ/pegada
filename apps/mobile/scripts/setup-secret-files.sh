#!/usr/bin/env bash
# Materialises the two Firebase config files expo's `googleServicesFile`
# points at. Runs from `preinstall`, so it happens before anything can read
# them.
#
# Both are gitignored (they hold real project ids and API keys on a machine
# that has them), so on a fresh checkout they do not exist and something has
# to produce them. The previous version of this was a one-liner in
# package.json:
#
#   [ ! -s ./google-services.json ] && printf '%s' "$GOOGLE_SERVICES_JSON" > ./google-services.json || echo ""
#
# With the secret unset — every clone that is not CI — `printf '%s' ""` wrote
# a ZERO-BYTE file, and `-s` is false for a zero-byte file, so it rewrote it
# empty on every install. An empty file is not a missing file: expo copies it
# into the native project, and `:app:processReleaseGoogleServices` fails the
# Android build with "Malformed root json". Every Android build in this repo
# has been unblocked by hand-copying a stub over it.
#
# So: prefer the real file, then the secret, then a committed stub that is
# valid, parseable, and obviously fake.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$HERE/.." && pwd)}"

# $1 target file, $2 name of the env var holding the secret, $3 committed stub
materialise() {
  local target="$APP_DIR/$1" var="$2" stub="$APP_DIR/$3"

  if [[ -s "$target" ]]; then
    return 0
  fi

  # Indirect expansion, and :- so `set -u` does not kill us on an unset var.
  local secret="${!var:-}"
  if [[ -n "$secret" ]]; then
    printf '%s' "$secret" >"$target"
    echo "setup:secret:files: wrote $1 from \$$var"
    return 0
  fi

  if [[ ! -f "$stub" ]]; then
    echo "setup:secret:files: no \$$var and no $3 to fall back on" >&2
    return 1
  fi

  cp "$stub" "$target"
  echo "setup:secret:files: \$$var is unset, using the local stub for $1" >&2
  echo "                    (fake project id and keys — fine to build and run" >&2
  echo "                     against, not fine to ship; push notifications and" >&2
  echo "                     anything else Firebase-backed will not work)" >&2
}

materialise google-services.json GOOGLE_SERVICES_JSON google-services.stub.json
materialise GoogleService-Info.plist GOOGLE_SERVICE_INFO_PLIST GoogleService-Info.stub.plist
