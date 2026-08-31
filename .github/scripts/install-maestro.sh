#!/usr/bin/env bash
set -euo pipefail

VERSION=2.6.0
ARCHIVE_SHA256=80185105a5d7e227e3b3fbcf225f45b312508ea676a9fc8e1b1aa1cac8b9ff6e
DOWNLOAD_URL="https://github.com/mobile-dev-inc/Maestro/releases/download/cli-${VERSION}/maestro.zip"

INSTALL_DIR=${1:?"usage: install-maestro.sh INSTALL_DIR"}
case "$INSTALL_DIR" in
  /|"")
    echo "error: refusing unsafe Maestro install directory" >&2
    exit 1
    ;;
esac

if ! java -version >/dev/null 2>&1; then
  echo "error: Maestro requires a working Java runtime" >&2
  exit 1
fi

TEMP_DIR=$(mktemp -d "${RUNNER_TEMP:-/tmp}/pegada-maestro.XXXXXX")
trap 'rm -rf "$TEMP_DIR"' EXIT
ARCHIVE="$TEMP_DIR/maestro.zip"

curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
  --retry 3 --retry-all-errors \
  --output "$ARCHIVE" "$DOWNLOAD_URL"
printf '%s  %s\n' "$ARCHIVE_SHA256" "$ARCHIVE" | shasum -a 256 --check

unzip -q "$ARCHIVE" -d "$TEMP_DIR/unpacked"
test -x "$TEMP_DIR/unpacked/maestro/bin/maestro"

mkdir -p "$INSTALL_DIR"
cp -R "$TEMP_DIR/unpacked/maestro/." "$INSTALL_DIR/"
"$INSTALL_DIR/bin/maestro" --version
