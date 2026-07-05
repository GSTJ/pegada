import { sendError } from "../errors/errors";
import { cacheFunctionResultFor } from "../shared/cacheFunctionResultFor";
import { posthog } from "../shared/posthog";

const FIVE_SECONDS = 5000;

// Cache the result of isFeatureEnabled for 5 seconds
// This prevents our quota from being exceeded.
const cachedIsFeatureEnabled = cacheFunctionResultFor(
  (feature: string) => posthog.isFeatureEnabled(feature, ""),
  FIVE_SECONDS,
);

export const FEATURES = {
  PROFANITY_CHECK: "profanity_check",
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
      return result;
    } catch (error) {
      sendError(error);
      return defaultValue;
    }
  }
}
