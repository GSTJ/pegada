#!/usr/bin/env bash
# Uploads readable JS sourcemaps to PostHog for the preceding `eas update`.
#
# Why this exists: `eas update` (run from .github/workflows/deploy-mobile.yml
# on every push to main) publishes a Hermes bundle but does NOT itself upload
# sourcemaps anywhere -- that's a separate, manual step per PostHog's docs
# (https://posthog.com/docs/error-tracking/upload-source-maps/react-native).
# Native Release builds get their upload wired automatically via the
# posthog-react-native/expo config plugin (see apps/mobile/app.config.ts and
# the Xcode/Gradle build phases it injects); OTA bundles have no build phase
# to hook into, so this script uploads the exact `dist` artifact that
# `eas update` just published. Re-exporting here would create a second bundle
# and only assume that it matched the bytes users receive.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
OUTPUT_DIR="${POSTHOG_SOURCEMAP_DIR:-$MOBILE_DIR/dist}"
RELEASE_NAME="app.pegada"

"$SCRIPT_DIR/validate-posthog-sourcemap-env.sh"
node "$SCRIPT_DIR/validate-posthog-sourcemaps-ota.mjs" "$OUTPUT_DIR"

if [ -n "${GITHUB_SHA:-}" ]; then
  RELEASE_VERSION="$GITHUB_SHA"
else
  RELEASE_VERSION="$(git -C "$REPO_ROOT" rev-parse HEAD)"
fi

# Chunk ids are already injected at bundle time by the posthog-react-native
# Metro serializer (see metro.config.js's getPostHogExpoConfig); only the
# upload step is needed here.
echo "Uploading the published OTA sourcemaps to PostHog..."
cd "$MOBILE_DIR"
corepack pnpm exec posthog-cli hermes upload \
  --directory "$OUTPUT_DIR" \
  --release-name "$RELEASE_NAME" \
  --release-version "$RELEASE_VERSION"

echo "PostHog sourcemap upload complete."
