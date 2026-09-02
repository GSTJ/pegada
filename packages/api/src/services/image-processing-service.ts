import type { ModerationResult } from "./image-moderation-service";
import type { ImageModerationMode } from "@pegada/shared/analytics/events";
import type { ImageStatus } from "@prisma/client";

import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { encode as encodeBlurhash } from "blurhash";
import sharp from "sharp";

import { config } from "../shared/config";
import { FEATURES, FlagService } from "./flag-service";
import { ImageModerationService } from "./image-moderation-service";

export type ImageModerationOutcome = {
  /** What to write to `Image.status`. */
  status: ImageStatus;
  /** Null when no call was made, which is the only case worth not charting. */
  result: ModerationResult | null;
  mode: ImageModerationMode;
};

export class ImageProcessingService {
  /**
   * Decide whether a freshly uploaded photo can be published.
   *
   * Two independent switches have to agree before a provider is called: the
   * `IMAGE_MODERATION_MODE` environment variable, which is a deploy-time
   * decision about how far the feature is turned up, and the `profanity_check`
   * PostHog flag, which is the runtime kill switch. Either one off means no
   * call, no cost, and the same APPROVED the old path produced.
   *
   * Only `enforce` can reject. An `error` verdict approves in every mode: a
   * provider outage must not be able to hold back everyone's photos at once.
   */
  static moderateImage = async ({
    arrayBuffer,
  }: {
    arrayBuffer: ArrayBuffer;
  }): Promise<ImageModerationOutcome> => {
    const mode = config.IMAGE_MODERATION_MODE;
    const skipped: ImageModerationOutcome = {
      status: IMAGE_STATUS.APPROVED,
      result: null,
      mode,
    };

    if (mode === "off") return skipped;

    const isModerationEnabled = await FlagService.isFeatureEnabled({
      feature: FEATURES.PROFANITY_CHECK,
      defaultValue: false,
    });

    if (!isModerationEnabled) return skipped;

    const result = await ImageModerationService.moderate(arrayBuffer);

    const status =
      mode === "enforce" && result.verdict === "reject"
        ? IMAGE_STATUS.REJECTED
        : IMAGE_STATUS.APPROVED;

    return { status, result, mode };
  };

  static async createBlurhash({ arrayBuffer }: { arrayBuffer: ArrayBuffer }) {
    const isBlurhashEnabled = await FlagService.isFeatureEnabled({
      feature: FEATURES.IMAGE_BLURHASH,
      defaultValue: true,
    });

    // In case this isn't working as intended or consuming too much bandwidth
    if (!isBlurhashEnabled) {
      return undefined;
    }

    const { data: pixels, info: metadata } = await sharp(arrayBuffer)
      .resize({ height: 100, withoutEnlargement: true })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const clamped = new Uint8ClampedArray(pixels);

    return encodeBlurhash(clamped, metadata.width, metadata.height, 4, 4);
  }
}
