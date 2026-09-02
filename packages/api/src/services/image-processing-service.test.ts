/**
 * The gate in front of the provider. Two switches have to agree before a photo
 * costs anything, and only one of the three modes is allowed to reject, so
 * these are the cases that decide whether a rollout is reversible.
 */
const config = { IMAGE_MODERATION_MODE: "off" as string };

jest.mock("../shared/config", () => ({
  config,
  isMagicEmail: () => false,
}));

const isFeatureEnabled = jest.fn();
jest.mock("./flag-service", () => ({
  FEATURES: {
    PROFANITY_CHECK: "profanity_check",
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
  isFeatureEnabled.mockResolvedValue(true);
  moderate.mockResolvedValue(verdict("approve"));
  getStoredModerationVerdict.mockResolvedValue({ moderationVerdict: null });
});

describe("ImageProcessingService.moderateImage", () => {
  it("calls nobody while the mode is off, whatever the flag says", async () => {
    config.IMAGE_MODERATION_MODE = "off";

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome).toEqual({ status: "APPROVED", result: null, mode: "off" });
    expect(moderate).not.toHaveBeenCalled();
    expect(isFeatureEnabled).not.toHaveBeenCalled();
  });

  it("calls nobody while the flag is off, whatever the mode says", async () => {
    config.IMAGE_MODERATION_MODE = "enforce";
    isFeatureEnabled.mockResolvedValue(false);

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome).toEqual({
      status: "APPROVED",
      result: null,
      mode: "enforce",
    });
    expect(moderate).not.toHaveBeenCalled();
  });

  it("defaults the flag to off, so an unreachable PostHog spends nothing", async () => {
    config.IMAGE_MODERATION_MODE = "shadow";

    await ImageProcessingService.moderateImage({ arrayBuffer, imageId });

    expect(isFeatureEnabled).toHaveBeenCalledWith({
      feature: "profanity_check",
      defaultValue: false,
    });
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

  it("publishes on a provider error even in enforce", async () => {
    config.IMAGE_MODERATION_MODE = "enforce";
    moderate.mockResolvedValue(verdict("error"));

    const outcome = await ImageProcessingService.moderateImage({
      arrayBuffer,
      imageId,
    });

    expect(outcome.status).toBe("APPROVED");
    expect(outcome.result?.verdict).toBe("error");
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
