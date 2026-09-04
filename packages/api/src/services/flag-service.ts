import { sendError } from "../errors/errors";
import { cacheFunctionResultFor } from "../shared/cache-function-result-for";
import { getPostHogNode } from "../shared/observability";

const FIVE_SECONDS = 5000;

// Cache the result of isFeatureEnabled for 5 seconds
// This prevents our quota from being exceeded.
//
// Reads the raw `posthog-node` handle rather than the shared client: feature
// flags are deliberately not wrapped by `magic-observability`. `undefined`
// (no key configured) falls through to the caller's `defaultValue` below,
// which is the same branch a PostHog outage takes.
const cachedIsFeatureEnabled = cacheFunctionResultFor(
  (feature: string) => getPostHogNode()?.isFeatureEnabled(feature, ""),
  FIVE_SECONDS,
);

export const FEATURES = {
  IMAGE_BLURHASH: "image_blurhash",
} as const;

export class FlagService {
  static async isFeatureEnabled({
    feature,
    defaultValue,
  }: {
    feature: (typeof FEATURES)[keyof typeof FEATURES];
    defaultValue: boolean;
  }) {
    try {
      const result = await cachedIsFeatureEnabled(feature);
      return result ?? defaultValue;
    } catch (error) {
      sendError(error);
      return defaultValue;
    }
  }
}
