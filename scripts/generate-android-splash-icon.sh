#!/usr/bin/env bash
#
# Regenerates the Android 12+ splash icon from the full-screen splash artwork.
#
# Why this exists
# ---------------
# `android.splash.{mdpi..xxxhdpi}` in app.config.ts feeds expo prebuild a set of
# FULL-SCREEN portrait compositions (splash-android@4x.png is 1724x3728).
# Android 12 replaced the full-screen splash with an *icon* window, so prebuild
# squares whatever it is given onto a 288 dp canvas and Android draws that
# canvas at ~192 dp. Squaring a 1724x3728 composition shrinks the wordmark to
# roughly 78 dp — a fifth of the size the JS splash that follows it draws the
# same wordmark at, which is the visible size-jump on every Android cold start.
#
# What it produces
# ----------------
# The Android 12 spec for an icon with no icon background: a 288x288 dp canvas
# whose inner 192x192 dp is the safe, always-visible area. So: transparent
# 288 dp square, wordmark centred, scaled to exactly 192 dp wide.
#
# The full-screen `splash-android*.png` files stay in the repo as the source
# artwork — this script reads the largest of them and never writes to them.
#
# Usage: ./scripts/generate-android-splash-icon.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
IMAGES="apps/mobile/src/assets/images"
SOURCE="$IMAGES/splash-android@4x.png"

command -v magick >/dev/null || {
  echo "generate-android-splash-icon: needs ImageMagick (brew install imagemagick)" >&2
  exit 1
}

# Prebuild's `imageWidth` default: the dp width it contains the mark into.
MARK_DP=200

# dpi bucket -> scale factor -> output suffix. mdpi is 1x and unsuffixed, which
# is the naming app.config.ts already uses for the full-screen set.
BUCKETS=("1 " "1.5 @1.5x" "2 @2x" "3 @3x" "4 @4x")

# Crop the wordmark out of the full-screen composition. `-trim` finds it by
# alpha, so this tracks the artwork instead of hard-coding a box.
MARK="$(mktemp -t splash-mark).png"
magick "$SOURCE" -trim +repage "$MARK"
echo "generate-android-splash-icon: wordmark $(magick identify -format '%wx%h' "$MARK") from $SOURCE"

for bucket in "${BUCKETS[@]}"; do
  read -r scale suffix <<<"$bucket"
  mark=$(echo "($MARK_DP * $scale + 0.5) / 1" | bc)
  out="$IMAGES/splash-android-icon${suffix}.png"

  magick "$MARK" -resize "${mark}x" -strip "$out"

  echo "  $(basename "$out")  $(magick identify -format '%wx%h' "$out")  ($(stat -f %z "$out") B)"
done

rm -f "$MARK"
