import type { ImageModerationOutcome } from "../../services/image-processing-service";
import type { IProcessImageJobData } from "../topics";

import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { MAX_IMAGE_BYTES } from "@pegada/shared/constants/constants";
import { Language } from "@pegada/shared/i18n/types/types";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";

import { sendError } from "../../errors/errors";
import { ImageProcessingService } from "../../services/image-processing-service";
import { ImageService } from "../../services/image-service";
import { PushNotificationService } from "../../services/push-notification-service";
import { TranslationService } from "../../services/translation-service";
import { captureEvent } from "../../shared/analytics";
import { assertAllowedImageUrl } from "../../shared/image-url";

export { MAX_IMAGE_BYTES };
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const readBoundedBody = async (response: Response): Promise<ArrayBuffer> => {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds the 10 MB processing limit");
  }

  if (!response.body) {
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image exceeds the 10 MB processing limit");
    }
    return body;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- A stream reader is sequential by contract.
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > MAX_IMAGE_BYTES) {
        // oxlint-disable-next-line no-await-in-loop -- Cancel this reader before rejecting its oversized body.
        await reader.cancel();
        throw new Error("Image exceeds the 10 MB processing limit");
      }
      chunks.push(value);
    }
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
};

export const downloadImage = async (url: string): Promise<ArrayBuffer> => {
  let currentUrl = url;
  let response: Response | undefined;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    assertAllowedImageUrl(currentUrl);
    // oxlint-disable-next-line no-await-in-loop -- Redirect targets must be validated before each request.
    response = await fetch(currentUrl, { redirect: "manual" });

    if (!REDIRECT_STATUSES.has(response.status)) break;

    const location = response.headers.get("location");
    if (!location) throw new Error("Image redirect is missing a location");
    if (redirects === MAX_REDIRECTS) {
      throw new Error("Image download exceeded the redirect limit");
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  if (!response) throw new Error("Image download did not return a response");
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
  }

  return readBoundedBody(response);
};

/**
 * The columns a verdict writes, or nothing at all when no call was made.
 *
 * Left untouched rather than nulled when moderation is off, so turning the
 * feature off does not erase the history that decided whether to turn it on.
 */
const moderationColumns = (outcome: ImageModerationOutcome) => {
  if (!outcome.result) return {};

  return {
    moderationVerdict: outcome.result.verdict,
    moderationScore: outcome.result.score,
    moderationReason: outcome.result.reason,
    moderationModel: outcome.result.model,
    moderatedAt: new Date(),
  };
};

/**
 * Report the verdict and, in `enforce`, tell the owner their photo was held
 * back.
 *
 * Everything here is best effort: the image row is already written by the time
 * this runs, and a failed analytics write or an undeliverable push must not
 * turn a processed image into a retried job that moderates the same photo
 * again at full price.
 */
const reportModeration = async (
  image: IProcessImageJobData,
  outcome: ImageModerationOutcome,
) => {
  if (!outcome.result) return;

  try {
    const owner = await ImageService.getImageOwner(image.id);
    const user = owner?.dog.user;

    captureEvent(
      // Falls back to the image id so a verdict on an image whose dog was
      // deleted mid-job is still counted, just not attributed to a person.
      user?.id ?? image.id,
      ANALYTICS_EVENTS.IMAGE_MODERATION_RESULT,
      {
        contains_dog: outcome.result.containsDog,
        cost_usd_estimate: outcome.result.costUsdEstimate,
        dog_id: owner?.dogId ?? image.dogId ?? null,
        image_id: image.id,
        latency_ms: outcome.result.latencyMs,
        mode: outcome.mode,
        model: outcome.result.model,
        reason: outcome.result.reason,
        verdict: outcome.result.verdict,
      },
    );

    if (outcome.status !== IMAGE_STATUS.REJECTED) return;
    if (!owner || !user?.pushToken) return;

    await PushNotificationService.enqueuePushNotification({
      to: user.pushToken,
      // The queue has no request to read a language from and `User` has no
      // language column, so this follows the re-engagement pushes and goes out
      // in pt-BR, which is where essentially all of the users are.
      title: TranslationService.translate(
        "server:notification.photoRejected.title",
        { lng: Language.PtBr, replace: { name: owner.dog.name } },
      ),
      body: TranslationService.translate(
        "server:notification.photoRejected.body",
        { lng: Language.PtBr },
      ),
      // The profile tab is where the photo grid is, so the tap lands on the
      // one screen where another photo can be added.
      data: { url: "profile" },
      userId: user.id,
      pushKind: "photo_rejected",
    });
  } catch (error) {
    sendError(error, { image_id: image.id });
  }
};

export const handleProcessImage = async (image: IProcessImageJobData) => {
  // The URL is validated on the way in and rebuilt from our own storage base
  // before it is persisted, so this should never fire. It is here because the
  // job is the one place the server makes an outbound request with a URL that
  // started life in a request body.
  const arrayBuffer = await downloadImage(image.url);

  const moderation = await ImageProcessingService.moderateImage({
    arrayBuffer,
  });

  let blurhash: string | undefined;

  // Blurhashes for rejected images are not needed
  if (moderation.status === IMAGE_STATUS.APPROVED) {
    // It's OK if this fails, we should still save the image.
    try {
      blurhash = await ImageProcessingService.createBlurhash({
        arrayBuffer,
      });
    } catch (error) {
      sendError(error);
    }
  }

  const updated = await ImageService.updateImage({
    ...image,
    blurhash,
    status: moderation.status,
    ...moderationColumns(moderation),
  });

  await reportModeration(image, moderation);

  return updated;
};
