import { z } from "zod";

const configSchema = z.object({
  ENV: z.enum(["development", "production"]),
  POSTHOG_API_KEY: z.string(),
  POSTHOG_HOST: z.string(),
  IOS_GOOGLE_MAPS_API_KEY: z.string(),
  ANDROID_GOOGLE_MAPS_API_KEY: z.string(),
  REVENUE_CAT_IOS_API_KEY: z.string(),
  REVENUE_CAT_ANDROID_API_KEY: z.string(),
  API_URL: z.string(),
  /**
   * When "1", routes RevenueCat purchase taps through the Maestro mock
   * endpoint (see packages/api/src/routes/payment.ts). NEVER set in
   * production builds — read alongside ENV !== "production" before use.
   */
  MAESTRO_E2E: z.string().optional().default("0"),
});

const _config = configSchema.safeParse({
  ENV: process.env.EXPO_PUBLIC_ENV,
  POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  IOS_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY,
  ANDROID_GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY,
  REVENUE_CAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUE_CAT_IOS_API_KEY,
  REVENUE_CAT_ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUE_CAT_ANDROID_API_KEY,
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  MAESTRO_E2E: process.env.EXPO_PUBLIC_MAESTRO_E2E,
});

if (!_config.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables", _config.error.format());
  throw new Error("Invalid environment variables.");
}

/**
 * The prod API lives on `www.pegada.app`; the bare apex `pegada.app`
 * 308-redirects there, and RN's fetch can't follow that redirect cleanly
 * (it hands back the "Redirecting..." body), which crashes the first tRPC
 * call. Normalize the apex to `www` and drop any trailing slash so the base
 * URL always hits the handler directly, regardless of the built env value.
 */
const normalizeApiUrl = (raw: string): string =>
  raw.replace(/\/+$/, "").replace(/^(https?:\/\/)pegada\.app(\/|$)/, "$1www.pegada.app$2");

export const config = {
  ..._config.data,
  API_URL: normalizeApiUrl(_config.data.API_URL),
};
