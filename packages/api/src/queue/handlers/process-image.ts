import type { IProcessImageJobData } from "../topics";

import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";

import { sendError } from "../../errors/errors";
import { ImageProcessingService } from "../../services/image-processing-service";
import { ImageService } from "../../services/image-service";
import { assertAllowedImageUrl } from "../../shared/image-url";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
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

export const handleProcessImage = async (image: IProcessImageJobData) => {
  // The URL is validated on the way in and rebuilt from our own storage base
  // before it is persisted, so this should never fire. It is here because the
  // job is the one place the server makes an outbound request with a URL that
  // started life in a request body.
  const arrayBuffer = await downloadImage(image.url);

  const status = await ImageProcessingService.checkForProfanity({
    arrayBuffer,
  });

  let blurhash: string | undefined;

  // Blurhashes for rejected images are not needed
  if (status === IMAGE_STATUS.APPROVED) {
    // It's OK if this fails, we should still save the image.
    try {
      blurhash = await ImageProcessingService.createBlurhash({
        arrayBuffer,
      });
    } catch (error) {
      sendError(error);
    }
  }

  return ImageService.updateImage({
    ...image,
    blurhash,
    status,
  });
};
