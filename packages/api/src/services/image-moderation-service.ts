import type { ImageModerationVerdict } from "@pegada/shared/analytics/events";
import type { LanguageModel } from "ai";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import sharp from "sharp";
import { z } from "zod";

import { sendError } from "../errors/errors";
import { config } from "../shared/config";

/** What the model is allowed to answer, and what the caller acts on. */
export const MODERATION_VERDICTS = ["approve", "reject"] as const;

/**
 * Why an image was rejected, in the model's own vocabulary. `none` rides along
 * with an approval so the schema has one shape rather than two, and `other` is
 * the escape hatch that stops the model inventing a category.
 */
export const MODERATION_REASONS = [
  "drug_paraphernalia",
  "gore",
  "hateful_symbol",
  "none",
  "nudity",
  "other",
  "sexual",
  "violence",
] as const;

const moderationSchema = z.object({
  verdict: z.enum(MODERATION_VERDICTS),
  /** How sure the model is that the photo breaks the rules, not how sure it is. */
  score: z.number().min(0).max(1),
  reason: z.enum(MODERATION_REASONS),
  containsDog: z.boolean(),
});

/**
 * The outcome of one moderation call.
 *
 * `error` is a third verdict rather than a thrown exception because every
 * caller treats a provider outage the same way: publish the photo. Folding it
 * into the result type means the analytics event records the outage too,
 * instead of it vanishing into a catch block.
 */
export type ModerationResult = {
  verdict: ImageModerationVerdict;
  /** 0..1 confidence that the image violates the rules. Null on `error`. */
  score: number | null;
  /** Short category, or the failure cause when the verdict is `error`. */
  reason: string | null;
  containsDog: boolean | null;
  /** The `<provider>/<model-id>` string the call was made with. */
  model: string;
  latencyMs: number;
  costUsdEstimate: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

/**
 * Adding a provider is one entry here plus one optional key in `config.ts`.
 *
 * The key is read through a function rather than captured at module load so a
 * test can change the environment between cases, and so a missing key is a
 * result rather than a throw from a provider constructor.
 */
const PROVIDERS = {
  google: {
    getApiKey: () => config.GOOGLE_GENERATIVE_AI_API_KEY,
    createModel: (apiKey: string, modelId: string): LanguageModel =>
      createGoogleGenerativeAI({ apiKey })(modelId),
  },
  openai: {
    getApiKey: () => config.OPENAI_API_KEY,
    createModel: (apiKey: string, modelId: string): LanguageModel =>
      createOpenAI({ apiKey })(modelId),
  },
} as const;

type ProviderName = keyof typeof PROVIDERS;

const isProviderName = (value: string): value is ProviderName =>
  Object.hasOwn(PROVIDERS, value);

/**
 * Published list prices in USD per million tokens, for the handful of models
 * cheap enough to run on every upload. An unlisted model gives a null estimate
 * rather than a wrong one: a cost chart that is quietly stale is worse than a
 * cost chart with a gap.
 */
const RATES_USD_PER_MILLION_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "gpt-5-nano": { input: 0.05, output: 0.4 },
};

/**
 * Gemini bills an image as one 258-token tile while it fits in 768x768, and
 * every other model charges less for a smaller picture too. Profile photos
 * arrive at phone-camera resolution, so this is the difference between a
 * fixed cost per image and one that scales with whatever the phone shot.
 */
const MAX_DIMENSION = 768;
const OUTBOUND_MEDIA_TYPE = "image/jpeg";
const TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = [
  "You moderate profile photos for a dog friendship app, where people post",
  "pictures of their dogs to find walking companions and playdates.",
  "",
  "Reject a photo ONLY when it contains one of these:",
  "- explicit sexual content or nudity",
  "- graphic violence or gore, including injured or dead animals",
  "- hateful symbols",
  "- drug paraphernalia",
  "",
  "Approve everything else. Photos of dogs, people with dogs, people on their",
  "own, children, homes, streets, parks, beaches, food, cars, screenshots and",
  "blurry or badly framed pictures are all approved. A photo is not rejected",
  "for being low quality, off topic, or for having no dog in it.",
  "",
  "Answer separately whether a dog is visible in the photo. That answer is for",
  "measurement only and must not change the verdict.",
  "",
  "score is your confidence from 0 to 1 that the photo breaks one of the four",
  "rules above, so an ordinary photo scores near 0 whatever the verdict says.",
  "Use reason 'none' when you approve.",
].join("\n");

const USER_PROMPT = "Moderate this profile photo.";

/**
 * Downscale to fit the tile budget and re-encode as JPEG, which every provider
 * accepts. `withoutEnlargement` keeps a small photo small rather than paying to
 * upscale it.
 */
const prepareImage = (image: ArrayBuffer | Buffer): Promise<Buffer> =>
  sharp(image)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();

/** Null unless both the rate and the token counts are known. */
export const estimateCostUsd = ({
  modelId,
  inputTokens,
  outputTokens,
}: {
  modelId: string;
  inputTokens: number | null;
  outputTokens: number | null;
}): number | null => {
  const rate = RATES_USD_PER_MILLION_TOKENS[modelId];
  if (!rate) return null;
  if (inputTokens === null && outputTokens === null) return null;

  const input = ((inputTokens ?? 0) * rate.input) / 1_000_000;
  const output = ((outputTokens ?? 0) * rate.output) / 1_000_000;

  return input + output;
};

/** `<provider>/<model-id>`, where the model id may itself contain slashes. */
export const parseModelSetting = (setting: string) => {
  const separator = setting.indexOf("/");
  if (separator <= 0) return null;

  const provider = setting.slice(0, separator);
  const modelId = setting.slice(separator + 1);
  if (!modelId || !isProviderName(provider)) return null;

  return { provider, modelId };
};

const finiteOrNull = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export class ImageModerationService {
  /**
   * Ask the configured model whether one photo is publishable.
   *
   * Never throws. A bad configuration, a timeout, a provider outage and a
   * response that does not match the schema all come back as verdict `error`,
   * because the alternative is a queue job that retries forever and a photo
   * that never leaves PENDING.
   */
  static async moderate(
    image: ArrayBuffer | Buffer,
  ): Promise<ModerationResult> {
    const setting = config.IMAGE_MODERATION_MODEL;
    const startedAt = Date.now();

    const failure = (reason: string): ModerationResult => ({
      verdict: "error",
      score: null,
      reason,
      containsDog: null,
      model: setting,
      latencyMs: Date.now() - startedAt,
      costUsdEstimate: null,
      inputTokens: null,
      outputTokens: null,
    });

    const parsed = parseModelSetting(setting);
    if (!parsed) {
      sendError(new Error(`Unsupported image moderation model: ${setting}`));
      return failure("unsupported_model");
    }

    const provider = PROVIDERS[parsed.provider];
    const apiKey = provider.getApiKey();
    if (!apiKey) return failure("missing_api_key");

    try {
      const data = await prepareImage(image);

      const result = await generateText({
        model: provider.createModel(apiKey, parsed.modelId),
        output: Output.object({ schema: moderationSchema }),
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              // Always the type `prepareImage` re-encodes to, whatever the
              // phone uploaded.
              { type: "file", mediaType: OUTBOUND_MEDIA_TYPE, data },
            ],
          },
        ],
        // One retry, then give up: this runs inside an image job with its own
        // retry, and a slow moderation call is a photo the owner is waiting on.
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      });

      // The SDK is asked for a typed object, but a model can still answer with
      // prose or half a field, and the types here say otherwise. Re-checking the
      // shape turns that into the `error` verdict the readout can count instead
      // of a result with an empty verdict in it.
      const answer = moderationSchema.safeParse(result.output);
      if (!answer.success) {
        sendError(
          new Error("Image moderation answer did not match the schema"),
          {
            image_moderation_model: setting,
          },
        );
        return failure("invalid_output");
      }

      const inputTokens = finiteOrNull(result.usage?.inputTokens);
      const outputTokens = finiteOrNull(result.usage?.outputTokens);

      return {
        verdict: answer.data.verdict,
        score: answer.data.score,
        reason: answer.data.reason,
        containsDog: answer.data.containsDog,
        model: setting,
        latencyMs: Date.now() - startedAt,
        costUsdEstimate: estimateCostUsd({
          modelId: parsed.modelId,
          inputTokens,
          outputTokens,
        }),
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      sendError(error, { image_moderation_model: setting });
      return failure("provider_error");
    }
  }
}
