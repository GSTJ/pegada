jest.mock("../../services/image-processing-service", () => ({
  ImageProcessingService: {
    moderateImage: jest
      .fn()
      .mockResolvedValue({ status: "APPROVED", result: null, mode: "off" }),
    createBlurhash: jest.fn().mockResolvedValue("blur"),
  },
}));

jest.mock("../../services/image-service", () => ({
  ImageService: {
    updateImage: jest.fn().mockResolvedValue({}),
    getImageOwner: jest.fn().mockResolvedValue({
      dogId: "dog-id",
      dog: {
        name: "Rex",
        user: { id: "user-id", pushToken: "ExponentPushToken[abc]" },
      },
    }),
  },
}));

jest.mock("../../services/push-notification-service", () => ({
  PushNotificationService: {
    enqueuePushNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../shared/analytics", () => ({ captureEvent: jest.fn() }));

jest.mock("../../errors/errors", () => ({ sendError: jest.fn() }));

import { ReadableStream } from "node:stream/web";

import { ImageProcessingService } from "../../services/image-processing-service";
import { ImageService } from "../../services/image-service";
import { PushNotificationService } from "../../services/push-notification-service";
import { captureEvent } from "../../shared/analytics";
import { config } from "../../shared/config";
import {
  downloadImage,
  handleProcessImage,
  MAX_IMAGE_BYTES,
} from "./process-image";

const BUCKET_URL = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`;

const fetchMock = jest.fn();

const moderateImage = jest.mocked(ImageProcessingService.moderateImage);
const updateImage = jest.mocked(ImageService.updateImage);
const enqueuePushNotification = jest.mocked(
  PushNotificationService.enqueuePushNotification,
);

const REJECTION = {
  verdict: "reject" as const,
  score: 0.93,
  reason: "gore",
  containsDog: false,
  model: "google/gemini-2.5-flash-lite",
  latencyMs: 512,
  costUsdEstimate: 0.000038,
  inputTokens: 300,
  outputTokens: 20,
};

beforeEach(() => {
  fetchMock.mockResolvedValue(new Response(new Uint8Array(8)));
  global.fetch = fetchMock as unknown as typeof fetch;
  moderateImage.mockResolvedValue({
    status: "APPROVED",
    result: null,
    mode: "off",
  });
  jest.mocked(ImageService.getImageOwner).mockResolvedValue({
    dogId: "dog-id",
    dog: {
      name: "Rex",
      user: { id: "user-id", pushToken: "ExponentPushToken[abc]" },
    },
  } as never);
});

describe("handleProcessImage", () => {
  it("downloads an image served from the configured bucket", async () => {
    await handleProcessImage({
      id: "image-id",
      url: `${BUCKET_URL}/dogs/1712345678`,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BUCKET_URL}/dogs/1712345678`, {
      redirect: "manual",
    });
    expect(ImageService.updateImage).toHaveBeenCalled();
  });

  it("does not fetch a URL on a host we do not serve images from", async () => {
    await expect(
      handleProcessImage({
        id: "image-id",
        url: "http://169.254.169.254/latest/meta-data/",
      }),
    ).rejects.toThrow("configured storage origin");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(ImageService.updateImage).not.toHaveBeenCalled();
  });

  it("rejects a declared image larger than the processing limit", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array(0), {
        headers: { "content-length": String(MAX_IMAGE_BYTES + 1) },
      }),
    );

    await expect(downloadImage(`${BUCKET_URL}/dogs/large`)).rejects.toThrow(
      "10 MB processing limit",
    );
  });

  it("stops a chunked image once it crosses the processing limit", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const response = new Response(body as never);
    fetchMock.mockResolvedValueOnce(response);

    await expect(downloadImage(`${BUCKET_URL}/dogs/chunked`)).rejects.toThrow(
      "10 MB processing limit",
    );
  });

  it("rejects a redirect outside the configured storage origins", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );

    await expect(downloadImage(`${BUCKET_URL}/dogs/redirect`)).rejects.toThrow(
      "configured storage origin",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("writes no verdict columns when no call was made", async () => {
    await handleProcessImage({ id: "image-id", url: `${BUCKET_URL}/dogs/1` });

    expect(updateImage.mock.calls[0]?.[0]).not.toHaveProperty(
      "moderationVerdict",
    );
    expect(captureEvent).not.toHaveBeenCalled();
    expect(enqueuePushNotification).not.toHaveBeenCalled();
  });

  it("records a shadow rejection, publishes the photo and pushes nobody", async () => {
    moderateImage.mockResolvedValue({
      status: "APPROVED",
      result: REJECTION,
      mode: "shadow",
    });

    await handleProcessImage({ id: "image-id", url: `${BUCKET_URL}/dogs/2` });

    expect(updateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "APPROVED",
        moderationVerdict: "reject",
        moderationScore: 0.93,
        moderationReason: "gore",
        moderationModel: "google/gemini-2.5-flash-lite",
        moderatedAt: expect.any(Date),
      }),
    );
    expect(captureEvent).toHaveBeenCalledWith(
      "user-id",
      "Image Moderation Result",
      expect.objectContaining({
        verdict: "reject",
        mode: "shadow",
        model: "google/gemini-2.5-flash-lite",
        latency_ms: 512,
        cost_usd_estimate: 0.000038,
        reason: "gore",
        contains_dog: false,
        image_id: "image-id",
        dog_id: "dog-id",
      }),
    );
    expect(enqueuePushNotification).not.toHaveBeenCalled();
  });

  it("holds the photo back in enforce and tells the owner", async () => {
    moderateImage.mockResolvedValue({
      status: "REJECTED",
      result: REJECTION,
      mode: "enforce",
    });

    await handleProcessImage({ id: "image-id", url: `${BUCKET_URL}/dogs/3` });

    expect(updateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "REJECTED",
        moderationVerdict: "reject",
      }),
    );
    // A rejected image is never shown, so nothing pays to blur it.
    expect(ImageProcessingService.createBlurhash).not.toHaveBeenCalled();
    expect(enqueuePushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ExponentPushToken[abc]",
        userId: "user-id",
        pushKind: "photo_rejected",
        data: { url: "profile" },
      }),
    );
    const [push] = enqueuePushNotification.mock.calls[0] ?? [];
    expect(push?.title).toContain("Rex");
    expect(push?.body).toBeTruthy();
  });

  it("skips the push when the owner has no device to send it to", async () => {
    moderateImage.mockResolvedValue({
      status: "REJECTED",
      result: REJECTION,
      mode: "enforce",
    });
    jest.mocked(ImageService.getImageOwner).mockResolvedValue({
      dogId: "dog-id",
      dog: { name: "Rex", user: { id: "user-id", pushToken: null } },
    } as never);

    await handleProcessImage({ id: "image-id", url: `${BUCKET_URL}/dogs/4` });

    expect(captureEvent).toHaveBeenCalled();
    expect(enqueuePushNotification).not.toHaveBeenCalled();
  });

  it("still saves the image when the owner lookup fails", async () => {
    moderateImage.mockResolvedValue({
      status: "APPROVED",
      result: { ...REJECTION, verdict: "error", reason: "provider_error" },
      mode: "enforce",
    });
    jest
      .mocked(ImageService.getImageOwner)
      .mockRejectedValue(new Error("database is away"));

    await expect(
      handleProcessImage({ id: "image-id", url: `${BUCKET_URL}/dogs/5` }),
    ).resolves.toBeDefined();

    expect(updateImage).toHaveBeenCalled();
  });

  it("follows a redirect that stays on the configured storage origin", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "/dogs/redirected" },
        }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array(8)));

    const body = await downloadImage(`${BUCKET_URL}/dogs/original`);
    expect(body.byteLength).toBe(8);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${BUCKET_URL}/dogs/redirected`,
      { redirect: "manual" },
    );
  });
});
