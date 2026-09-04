/**
 * The moderation service is the one place in the API that spends money per
 * request and the one place a bug can hide someone's photo, so the cases below
 * are the two properties that matter: it never throws, and it only ever says
 * `reject` because the model said so.
 */
const config = {
  IMAGE_MODERATION_MODE: "shadow" as string,
  IMAGE_MODERATION_MODEL: "google/gemini-2.5-flash-lite",
  GOOGLE_GENERATIVE_AI_API_KEY: "google-key" as string | undefined,
  OPENAI_API_KEY: "openai-key" as string | undefined,
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

const generateText = jest.fn();
jest.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
  Output: { object: (options: unknown) => ({ marker: "output", options }) },
}));

const createGoogleModel = jest.fn(
  (modelId: string) => `google-model:${modelId}`,
);
const createGoogleGenerativeAI = jest.fn(
  (..._options: unknown[]) => createGoogleModel,
);
jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: (...args: unknown[]) =>
    createGoogleGenerativeAI(...args),
}));

const createOpenAiModel = jest.fn(
  (modelId: string) => `openai-model:${modelId}`,
);
const createOpenAI = jest.fn((..._options: unknown[]) => createOpenAiModel);
jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: (...args: unknown[]) => createOpenAI(...args),
}));

import sharp from "sharp";

import {
  estimateCostUsd,
  ImageModerationService,
  parseModelSetting,
} from "./image-moderation-service";

/** A real JPEG, so the sharp downscale in front of the call is exercised too. */
const makePhoto = (size = 1024) =>
  sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 120, g: 90, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();

const answer = (
  output: Record<string, unknown>,
  usage: Record<string, number> = { inputTokens: 300, outputTokens: 20 },
) => ({ output, usage });

const APPROVAL = {
  verdict: "approve",
  score: 0.02,
  reason: "none",
  containsDog: true,
};

const REJECTION = {
  verdict: "reject",
  score: 0.94,
  reason: "sexual",
  containsDog: false,
};

let photo: Buffer;

beforeAll(async () => {
  photo = await makePhoto();
});

beforeEach(() => {
  config.IMAGE_MODERATION_MODEL = "google/gemini-2.5-flash-lite";
  config.GOOGLE_GENERATIVE_AI_API_KEY = "google-key";
  config.OPENAI_API_KEY = "openai-key";
  sendError.mockClear();
  generateText.mockResolvedValue(answer(APPROVAL));
});

describe("ImageModerationService.moderate", () => {
  it("passes an approval straight through, with the model and its cost", async () => {
    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "approve",
      score: 0.02,
      reason: "none",
      containsDog: true,
      model: "google/gemini-2.5-flash-lite",
      inputTokens: 300,
      outputTokens: 20,
    });
    // 300 in at $0.10/M plus 20 out at $0.40/M.
    expect(result.costUsdEstimate).toBeCloseTo(0.000038, 9);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(sendError).not.toHaveBeenCalled();
  });

  it("reports a rejection with the category the model gave", async () => {
    generateText.mockResolvedValue(answer(REJECTION));

    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "reject",
      reason: "sexual",
      score: 0.94,
      containsDog: false,
    });
  });

  it("sends a downscaled JPEG rather than whatever the phone shot", async () => {
    await ImageModerationService.moderate(photo);

    const [call] = generateText.mock.calls as [
      [
        {
          messages: {
            content: { data?: Buffer; mediaType?: string; type: string }[];
          }[];
          maxRetries: number;
          abortSignal: AbortSignal;
        },
      ],
    ];
    const [options] = call;
    const file = options.messages[0]?.content.find(
      (part) => part.type === "file",
    );
    const data = file?.data as Buffer;

    expect(file?.mediaType).toBe("image/jpeg");
    expect(options.maxRetries).toBe(1);
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);

    const metadata = await sharp(data).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBe(768);
    expect(data.byteLength).toBeLessThan(photo.byteLength);
  });

  it("fails open when the provider throws, and reports the failure", async () => {
    generateText.mockRejectedValue(new Error("503 from the provider"));

    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "error",
      reason: "provider_error",
      score: null,
      containsDog: null,
      costUsdEstimate: null,
    });
    expect(sendError).toHaveBeenCalled();
  });

  it("fails open on a timeout, which reaches it as a provider error", async () => {
    generateText.mockRejectedValue(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );

    const result = await ImageModerationService.moderate(photo);

    expect(result.verdict).toBe("error");
    expect(result.reason).toBe("provider_error");
  });

  it("fails open without calling anyone when the key is missing", async () => {
    config.GOOGLE_GENERATIVE_AI_API_KEY = undefined;

    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "error",
      reason: "missing_api_key",
      model: "google/gemini-2.5-flash-lite",
    });
    expect(generateText).not.toHaveBeenCalled();
    // A key that was never configured is a deployment fact, not an incident.
    expect(sendError).not.toHaveBeenCalled();
  });

  it("fails open on a key that is set to an empty string", async () => {
    config.GOOGLE_GENERATIVE_AI_API_KEY = "";

    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "error",
      reason: "missing_api_key",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("fails open when the provider refuses on quota", async () => {
    generateText.mockRejectedValue(
      Object.assign(new Error("429 RESOURCE_EXHAUSTED"), { statusCode: 429 }),
    );

    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "error",
      reason: "provider_error",
    });
    expect(sendError).toHaveBeenCalled();
  });

  it("fails open when the model answers with prose instead of the object", async () => {
    generateText.mockResolvedValue(answer("looks fine to me" as never));

    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "error",
      reason: "invalid_output",
      score: null,
    });
    expect(sendError).toHaveBeenCalled();
  });

  it("fails open when the answer is missing half its fields", async () => {
    generateText.mockResolvedValue(answer({ verdict: "reject" }));

    const result = await ImageModerationService.moderate(photo);

    // A half answer that mentions a rejection must not become one.
    expect(result.verdict).toBe("error");
    expect(result.reason).toBe("invalid_output");
  });

  it("fails open when the answer invents a verdict of its own", async () => {
    generateText.mockResolvedValue(
      answer({ ...APPROVAL, verdict: "maybe_reject" }),
    );

    const result = await ImageModerationService.moderate(photo);

    expect(result.verdict).toBe("error");
    expect(result.reason).toBe("invalid_output");
  });

  it("fails open when the upload is not a picture the resizer can read", async () => {
    const notAPhoto = Buffer.from("this is not an image");

    const result = await ImageModerationService.moderate(notAPhoto);

    expect(result).toMatchObject({
      verdict: "error",
      reason: "provider_error",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("fails open on a model string no provider claims", async () => {
    config.IMAGE_MODERATION_MODEL = "anthropic/claude";

    const result = await ImageModerationService.moderate(photo);

    expect(result).toMatchObject({
      verdict: "error",
      reason: "unsupported_model",
    });
    expect(generateText).not.toHaveBeenCalled();
    expect(sendError).toHaveBeenCalled();
  });

  it("switches provider on the environment variable alone", async () => {
    config.IMAGE_MODERATION_MODEL = "openai/gpt-5-nano";
    generateText.mockResolvedValue(
      answer(APPROVAL, { inputTokens: 1000, outputTokens: 100 }),
    );

    const result = await ImageModerationService.moderate(photo);

    expect(createOpenAI).toHaveBeenCalledWith({ apiKey: "openai-key" });
    expect(createOpenAiModel).toHaveBeenCalledWith("gpt-5-nano");
    expect(createGoogleGenerativeAI).not.toHaveBeenCalled();
    expect(result.model).toBe("openai/gpt-5-nano");
    // 1000 in at $0.05/M plus 100 out at $0.40/M.
    expect(result.costUsdEstimate).toBeCloseTo(0.00009, 9);
  });

  it("leaves the cost null when the provider reports no usage", async () => {
    generateText.mockResolvedValue({ output: APPROVAL, usage: undefined });

    const result = await ImageModerationService.moderate(photo);

    expect(result.verdict).toBe("approve");
    expect(result.inputTokens).toBeNull();
    expect(result.costUsdEstimate).toBeNull();
  });
});

describe("estimateCostUsd", () => {
  it("prices a known model off its published rate", () => {
    expect(
      estimateCostUsd({
        modelId: "gemini-2.5-flash-lite",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      }),
    ).toBeCloseTo(0.5, 9);
  });

  it("gives no number for a model it has no rate for", () => {
    expect(
      estimateCostUsd({
        modelId: "gemini-9-ultra",
        inputTokens: 100,
        outputTokens: 10,
      }),
    ).toBeNull();
  });

  it("counts a missing half as zero rather than dropping the estimate", () => {
    expect(
      estimateCostUsd({
        modelId: "gpt-4.1-nano",
        inputTokens: 1_000_000,
        outputTokens: null,
      }),
    ).toBeCloseTo(0.1, 9);
  });
});

describe("parseModelSetting", () => {
  it.each([
    ["google/gemini-2.5-flash-lite", "google", "gemini-2.5-flash-lite"],
    ["openai/gpt-5-nano", "openai", "gpt-5-nano"],
    ["google/models/one/two", "google", "models/one/two"],
  ])("splits %s on the first slash", (setting, provider, modelId) => {
    expect(parseModelSetting(setting)).toEqual({ provider, modelId });
  });

  it.each([
    "gemini-2.5-flash-lite",
    "/gpt-5-nano",
    "google/",
    "cohere/command",
  ])("refuses %s", (setting) => {
    expect(parseModelSetting(setting)).toBeNull();
  });
});
