import { PostHog } from "posthog-node";

import { sendError } from "../errors/errors";
import { cacheFunctionResultFor } from "../shared/cacheFunctionResultFor";
import { config } from "../shared/config";

const client = new PostHog(config.POSTHOG_API_KEY, {
  host: config.POSTHOG_HOST
});

const FIVE_SECONDS = 5000;

// Cache the result of isFeatureEnabled for 5 seconds
// This prevents our quota from being exceeded.
const cachedIsFeatureEnabled = cacheFunctionResultFor(
  (feature: string) => client.isFeatureEnabled(feature, ""),
  FIVE_SECONDS
);

export const FEATURES = {
  PROFANITY_CHECK: "profanity_check",
  IMAGE_BLURHASH: "image_blurhash"
} as const;

export class FlagService {
  static async isFeatureEnabled({
    feature,
    defaultValue
  }: {
    feature: (typeof FEATURES)[keyof typeof FEATURES];
    defaultValue: boolean;
  }) {
    try {
      const result = await cachedIsFeatureEnabled(feature);
      return result;
    } catch (error) {
      sendError(error);
      return defaultValue;
    }
  }
}
