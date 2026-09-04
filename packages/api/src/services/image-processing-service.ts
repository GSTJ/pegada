import type { ModerationResult } from "./image-moderation-service";
import type { ImageModerationMode } from "@pegada/shared/analytics/events";
import type { ImageStatus } from "@prisma/client";

import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { encode as encodeBlurhash } from "blurhash";
import sharp from "sharp";

import { sendError } from "../errors/errors";
import { config } from "../shared/config";
import { FEATURES, FlagService } from "./flag-service";
import { ImageModerationService } from "./image-moderation-service";
import { ImageService } from "./image-service";

export type ImageModerationOutcome = {
  /** What to write to `Image.status`. */
  status: ImageStatus;
  /**
   * The verdict this run produced, or null when no call was made. Null covers
   * both a photo nobody moderated and a redelivered job reusing a verdict that
   * is already on the row, which is exactly the set of cases that must not be
   * written, charted or pushed about a second time.
   */
  result: ModerationResult | null;
  mode: ImageModerationMode;
};

/** Only `enforce` can turn a rejection into a status. */
const statusFor = (mode: ImageModerationMode, verdict: string) =>
  mode === "enforce" && verdict === "reject"
    ? IMAGE_STATUS.REJECTED
    : IMAGE_STATUS.APPROVED;

export class ImageProcessingService {
  /**
   * Decide whether a freshly uploaded photo can be published.
   *
   * `IMAGE_MODERATION_MODE` is the only switch. `off` calls nobody and costs
   * nothing, `shadow` buys a verdict and records it without letting it change
   * the status, and `enforce` is the one mode allowed to reject. Turning the
   * feature down is a change of that variable, which is also the level the
   * cost lives at.
   *
   * An `error` verdict approves in every mode: a provider outage must not be
   * able to hold back everyone's photos at once.
   */
  static moderateImage = async ({
    arrayBuffer,
    imageId,
  }: {
    arrayBuffer: ArrayBuffer;
    imageId: string;
  }): Promise<ImageModerationOutcome> => {
    const mode = config.IMAGE_MODERATION_MODE;
    const skipped: ImageModerationOutcome = {
      status: IMAGE_STATUS.APPROVED,
      result: null,
      mode,
    };

    if (mode === "off") return skipped;

    const startedAt = Date.now();

    try {
      return await ImageProcessingService.runModeration({
        arrayBuffer,
        imageId,
        mode,
      });
    } catch (error) {
      // The moderation service is written never to throw, so anything landing
      // here came from below it, such as the verdict lookup losing the
      // database. Publishing is still the right answer, and reporting it as an
      // `error` verdict keeps the failure in the same chart as every other one
      // instead of dropping it.
      sendError(error, { image_id: imageId });

      return {
        status: IMAGE_STATUS.APPROVED,
        result: {
          verdict: "error",
          score: null,
          reason: "unexpected_error",
          containsDog: null,
          model: config.IMAGE_MODERATION_MODEL,
          latencyMs: Date.now() - startedAt,
          costUsdEstimate: null,
          inputTokens: null,
          outputTokens: null,
        },
        mode,
      };
    }
  };

  private static runModeration = async ({
    arrayBuffer,
    imageId,
    mode,
  }: {
    arrayBuffer: ArrayBuffer;
    imageId: string;
    mode: ImageModerationMode;
  }): Promise<ImageModerationOutcome> => {
    // The queue delivers at least once, and the job can also be retried after
    // the write that follows this call fails. A row that already carries a
    // verdict has already been paid for, so the redelivery re-derives the
    // status from it instead of buying a second opinion. The read only happens
    // on jobs that would otherwise call a provider, so the `off` path is still
    // a single query.
    const stored = await ImageService.getStoredModerationVerdict(imageId);
    if (stored?.moderationVerdict) {
      return {
        status: statusFor(mode, stored.moderationVerdict),
        result: null,
        mode,
      };
    }

    const result = await ImageModerationService.moderate(arrayBuffer);

    return { status: statusFor(mode, result.verdict), result, mode };
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
