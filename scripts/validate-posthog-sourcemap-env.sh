#!/usr/bin/env bash
# Validates PostHog CLI configuration without printing credential values.
set -euo pipefail

missing=0
for variable_name in POSTHOG_CLI_API_KEY POSTHOG_CLI_HOST POSTHOG_CLI_PROJECT_ID; do
  if [ -z "${!variable_name:-}" ]; then
    echo "error: $variable_name is required for production PostHog sourcemap uploads." >&2
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "error: configure the missing value(s) in the EAS production environment; no sourcemaps were uploaded." >&2
  exit 1
fi

if [ "${POSTHOG_CLI_DRY_RUN:-false}" = "true" ]; then
  echo "error: POSTHOG_CLI_DRY_RUN must be disabled for production releases; refusing to report a simulated upload as successful." >&2
  exit 1
fi

case "$POSTHOG_CLI_API_KEY" in
  phx_*) ;;
  *)
    echo "error: POSTHOG_CLI_API_KEY must be a PostHog personal API key (phx_ prefix); no sourcemaps were uploaded." >&2
    exit 1
    ;;
esac

case "$POSTHOG_CLI_HOST" in
  https://*) ;;
  *)
    echo "error: POSTHOG_CLI_HOST must be an https:// URL; no sourcemaps were uploaded." >&2
    exit 1
    ;;
esac

case "$POSTHOG_CLI_PROJECT_ID" in
  *[!0-9]* | "")
    echo "error: POSTHOG_CLI_PROJECT_ID must be numeric; no sourcemaps were uploaded." >&2
    exit 1
    ;;
esac

echo "PostHog sourcemap environment is configured."
