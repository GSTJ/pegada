#!/usr/bin/env bash
# Uploads readable JS sourcemaps to PostHog for an `eas update` OTA bundle.
#
# Why this exists: `eas update` (run from .github/workflows/deploy-mobile.yml
# on every push to main) publishes a Hermes bundle but does NOT itself upload
# sourcemaps anywhere -- that's a separate, manual step per PostHog's docs
# (https://posthog.com/docs/error-tracking/upload-source-maps/react-native).
# Native Release builds get their upload wired automatically via the
# posthog-react-native/expo config plugin (see apps/mobile/app.config.ts and
# the Xcode/Gradle build phases it injects); OTA bundles have no build phase
# to hook into, so this script re-exports the same JS with sourcemaps and
# uploads them explicitly.
#
# Guarded on POSTHOG_CLI_API_KEY so this is a silent no-op for anyone running
# it without the CI/EAS-provided credentials (matches the native-build guard
# in app.config.ts) -- never fails a deploy just because sourcemaps aren't
# configured.
set -euo pipefail

if [ -z "${POSTHOG_CLI_API_KEY:-}" ]; then
  echo "POSTHOG_CLI_API_KEY not set; skipping PostHog sourcemap upload."
  exit 0
fi

cd "$(dirname "$0")/../apps/mobile"

OUTPUT_DIR="dist"
# Bundle identifier is stable across OTA updates (only the JS changes), so
# every OTA upload is tagged under the same release-name as native builds.
# release-version is left to posthog-cli's own git auto-detection: it
# derives commit/branch info from the checkout, which ties each OTA upload
# to the exact commit `eas update` published -- more precise than the app's
# semver for this path, since many OTAs land between version bumps.
RELEASE_NAME="app.pegada"

echo "Exporting JS bundle + sourcemaps to $OUTPUT_DIR..."
npx expo export --dump-sourcemap --output-dir "$OUTPUT_DIR"

# Chunk ids are already injected at bundle time by the posthog-react-native
# Metro serializer (see metro.config.js's getPostHogExpoConfig); only the
# upload step is needed here.
echo "Uploading sourcemaps to PostHog..."
npx posthog-cli hermes upload \
  --directory "$OUTPUT_DIR" \
  --release-name "$RELEASE_NAME"

echo "PostHog sourcemap upload complete."
