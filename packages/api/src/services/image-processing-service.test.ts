/**
 * The gate in front of the provider. The mode is the whole gate: it decides
 * whether a photo costs anything and it is the only thing allowed to reject,
 * so these are the cases that decide whether a rollout is reversible.
 */
const config = {
  IMAGE_MODERATION_MODE: "off" as string,
  IMAGE_MODERATION_MODEL: "google/gemini-2.5-flash-lite",
};

jest.mock("../shared/config", () => ({
  config,
  isMagicEmail: () => false,
}));

const sendError = jest.fn();
jest.mock("../errors/errors", () => ({
  sendError: (...args: unknown[]) => sendError(...args),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

const isFeatureEnabled = jest.fn();
jest.mock("./flag-service", () => ({
  FEATURES: {
    IMAGE_BLURHASH: "image_blurhash",
  },
  FlagService: {
    isFeatureEnabled: (...args: unknown[]) => isFeatureEnabled(...args),
  },
}));

const moderate = jest.fn();
jest.mock("./image-moderation-service", () => ({
  ImageModerationService: {
    moderate: (...args: unknown[]) => moderate(...args),
  },
}));

const getStoredModerationVerdict = jest.fn();
jest.mock("./image-service", () => ({
  ImageService: {
    getStoredModerationVerdict: (...args: unknown[]) =>
      getStoredModerationVerdict(...args),
  },
}));

import { ImageProcessingService } from "./image-processing-service";

const arrayBuffer = new ArrayBuffer(8);
const imageId = "image-id";

const verdict = (value: "approve" | "error" | "reject") => ({
  verdict: value,
  score: value === "reject" ? 0.9 : 0.01,
  reason: value === "reject" ? "gore" : "none",
  containsDog: true,
  model: "google/gemini-2.5-flash-lite",
  latencyMs: 420,
  costUsdEstimate: 0.00004,
  inputTokens: 300,
  outputTokens: 20,
});

beforeEach(() => {
  sendError.mockClear();
  isFeatureEnabled.mockResolvedValue(true);
  moderate.mockResolvedValue(verdict("approve"));
  getStoredModerationVerdict.mockResolvedValue({ moderationVerdict: null });
});

describe("ImageProcessingService.moderateImage", () => {
  it("calls nobody while the mode is off", async () => {
    config.IMAGE_MODERATION_MODE = "off";

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome).toEqual({ status: "APPROVED", result: null, mode: "off" });
    expect(moderate).not.toHaveBeenCalled();
  });

  it("moderates on the mode alone, with no flag left to consult", async () => {
    config.IMAGE_MODERATION_MODE = "shadow";
    isFeatureEnabled.mockResolvedValue(false);

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    // A disabled flag used to swallow every call here, which is why shadow ran
    // in production for a week without producing a single verdict.
    expect(isFeatureEnabled).not.toHaveBeenCalled();
    expect(moderate).toHaveBeenCalledWith(arrayBuffer);
    expect(outcome.result?.verdict).toBe("approve");
  });

  it("records an approval in shadow without touching the status", async () => {
    config.IMAGE_MODERATION_MODE = "shadow";

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome.status).toBe("APPROVED");
    // A non null result is what makes the handler emit the verdict event, so
    // shadow reports as loudly as enforce does.
    expect(outcome.result).toMatchObject({ verdict: "approve" });
    expect(outcome.mode).toBe("shadow");
  });

  it("keeps a rejection out of the status in shadow, but keeps the verdict", async () => {
    config.IMAGE_MODERATION_MODE = "shadow";
    moderate.mockResolvedValue(verdict("reject"));

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome.status).toBe("APPROVED");
    expect(outcome.result).toMatchObject({ verdict: "reject", reason: "gore" });
    expect(outcome.mode).toBe("shadow");
  });

  it("rejects in enforce, which is the only mode that can", async () => {
    config.IMAGE_MODERATION_MODE = "enforce";
    moderate.mockResolvedValue(verdict("reject"));

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome.status).toBe("REJECTED");
    expect(outcome.result?.verdict).toBe("reject");
  });

  // Every way the provider can let us down arrives here as the same `error`
  // verdict, so the property worth pinning is that none of them, in either
  // mode that calls anyone, can hold a photo back.
  it.each(["shadow", "enforce"])(
    "publishes the photo on a provider failure in %s",
    async (mode) => {
      config.IMAGE_MODERATION_MODE = mode;
      moderate.mockResolvedValue({
        ...verdict("error"),
        reason: "provider_error",
      });

      const outcome = await ImageProcessingService.moderateImage({
        arrayBuffer,
        imageId,
      });

      expect(outcome.status).toBe("APPROVED");
      // The failure still travels back as a result, which is what puts it in
      // the readout rather than leaving the week looking quiet.
      expect(outcome.result).toMatchObject({
        verdict: "error",
        reason: "provider_error",
      });
      expect(outcome.mode).toBe(mode);
    },
  );

  it.each(["shadow", "enforce"])(
    "publishes the photo when the call itself blows up in %s",
    async (mode) => {
      config.IMAGE_MODERATION_MODE = mode;
      moderate.mockRejectedValue(new Error("socket hang up"));

      const outcome = await ImageProcessingService.moderateImage({
        arrayBuffer,
        imageId,
      });

      expect(outcome.status).toBe("APPROVED");
      expect(outcome.result).toMatchObject({
        verdict: "error",
        reason: "unexpected_error",
      });
      expect(sendError).toHaveBeenCalled();
    },
  );

  it("publishes the photo when the stored verdict lookup fails", async () => {
    config.IMAGE_MODERATION_MODE = "enforce";
    getStoredModerationVerdict.mockRejectedValue(new Error("database is away"));

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome.status).toBe("APPROVED");
    expect(outcome.result?.verdict).toBe("error");
    expect(moderate).not.toHaveBeenCalled();
  });

  it("publishes an approval in enforce", async () => {
    config.IMAGE_MODERATION_MODE = "enforce";

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome.status).toBe("APPROVED");
    expect(moderate).toHaveBeenCalledWith(arrayBuffer);
  });

  it("reuses a verdict the row already carries instead of paying twice", async () => {
    config.IMAGE_MODERATION_MODE = "enforce";
    getStoredModerationVerdict.mockResolvedValue({
      moderationVerdict: "reject",
    });

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    // The status still comes out REJECTED, so a redelivered job cannot quietly
    // republish a photo that was already held back.
    expect(outcome.status).toBe("REJECTED");
    // Null keeps the caller from rewriting the columns, recounting the event or
    // sending the owner a second push.
    expect(outcome.result).toBeNull();
    expect(moderate).not.toHaveBeenCalled();
  });

  it("does not look up a stored verdict when it would not call anyone", async () => {
    config.IMAGE_MODERATION_MODE = "off";

    await ImageProcessingService.moderateImage({ arrayBuffer, imageId });

    expect(getStoredModerationVerdict).not.toHaveBeenCalled();
  });
});
