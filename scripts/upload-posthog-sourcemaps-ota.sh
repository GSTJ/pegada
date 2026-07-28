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

# The bundle identifier is stable across OTA updates (only the JS changes), so
# every OTA upload is filed under the same release-name as native builds.
RELEASE_NAME="app.pegada"

# posthog-cli's own docs call setting this explicitly "strongly recommended
# during release CD workflows". It used to be left to the CLI's git
# auto-detection, which read the same commit out of the checkout -- but only
# as long as the checkout has git metadata, and it silently produced a
# different value (or none) if it ever didn't. GITHUB_SHA in CI, the local
# HEAD otherwise.
RELEASE_VERSION="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"

echo "Exporting JS bundle + sourcemaps to $OUTPUT_DIR..."
npx expo export --dump-sourcemap --output-dir "$OUTPUT_DIR"

# Chunk ids are already injected at bundle time by the posthog-react-native
# Metro serializer (see metro.config.js's getPostHogExpoConfig); only the
# upload step is needed here.
#
# --force is what makes this idempotent, and it is load-bearing. The Metro
# serializer's chunk id is stable per platform bundle, not derived from the
# bundle's contents, so every OTA update re-uploads the SAME two symbol sets
# (one ios, one android) with different content. PostHog rejects that by
# default:
#
#   400 release_id_mismatch   "Symbol set <uuid> already has a release ID"
#   400 content_hash_mismatch "Symbol set <uuid> already exists with different content."
#   Oops! Content mismatch: use --skip-on-conflict or --force
#
# which is exactly how run 30316394285 went red on main after the OTA had
# already shipped. Of the two remedies the CLI offers, --force is the correct
# one here and --skip-on-conflict is actively wrong: skipping keeps the
# PREVIOUS bundle's maps, so every stack trace from the update we just
# published would symbolicate against stale sources. An OTA is a rolling
# deploy -- the newest bundle is the one in users' hands, and its maps are the
# ones worth keeping.
#
# What --force does not fix: a symbol set that already carries a release id
# keeps the first one it was given, because PostHog will not rebind it. The
# CLI degrades to an unreleased upload on its own (--skip-release-on-fail,
# on by default). That costs nothing that matters -- symbolication joins a
# stack frame to a sourcemap by CHUNK ID, and the release is metadata beside
# it. The app-side join is separate and intact: initExpo registers the OTA
# update group as the `release` super property on every event (see
# apps/mobile/src/services/observability.ts).
echo "Uploading sourcemaps to PostHog ($RELEASE_NAME@$RELEASE_VERSION)..."
npx posthog-cli hermes upload \
  --directory "$OUTPUT_DIR" \
  --release-name "$RELEASE_NAME" \
  --release-version "$RELEASE_VERSION" \
  --force

echo "PostHog sourcemap upload complete."
