import semver from "semver";
import { z } from "zod";

export const semverSchema = z.string().refine((version) => {
  const isValid = semver.valid(version);
  if (!isValid) throw new Error("Invalid version");

  return isValid;
});

const configSchema = z.object({
  /** GENERAL */
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  /** LOGGING */
  BUGSNAG_API_KEY: z.string(),

  /** POSTHOG */
  POSTHOG_API_KEY: z.string(),
  POSTHOG_HOST: z.string(),

  /** SERVER */
  PORT: z.coerce.number().default(3009),

  /** AUTH */
  JWT_SECRET: z.string(),

  /** AWS */
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),
  /**
   * Dev/e2e only: point the S3 client at a local S3-compatible endpoint
   * (MinIO from packages/database/docker-compose.yml) so image uploads
   * work without real AWS credentials. Never set in production.
   */
  AWS_S3_ENDPOINT: z.string().optional(),

  /** MAIL */
  MAIL_USER: z.string(),
  MAIL_NAME: z.string(),
  RESEND_API_KEY: z.string(),

  /** PUSH (Expo access token for send + receipt consumers) */
  EXPO_ACCESS_TOKEN: z.string().optional(),

  /** APP */
  MIN_APP_VERSION: semverSchema,

  /**
   * APPLE MAGIC
   *
   * APPLE_MAGIC_EMAIL accepts a single email or a comma-separated list of
   * emails. All listed emails bypass real OTP delivery and accept
   * APPLE_MAGIC_CODE during verification — required for Apple App Review and
   * Maestro E2E flows. The list form is needed for destructive flows
   * (delete-account) that must not nuke the primary review account.
   */
  APPLE_MAGIC_EMAIL: z.string().optional(),
  APPLE_MAGIC_CODE: z.string().optional(),
  /**
   * Optional regex matched against the submitted email to treat ANY matching
   * address as a magic test account. Unlike `APPLE_MAGIC_EMAIL`, every login
   * for a regex-matched address hard-deletes the existing user record first,
   * guaranteeing a fresh-onboarding state on each Maestro E2E run.
   *
   * Only honored when `NODE_ENV !== 'production'` so production traffic is
   * never affected even if a regex is accidentally configured.
   *
   * Example: `^maestro-fresh.*@pegada\.app$`
   */
  APPLE_MAGIC_EMAIL_REGEX: z.string().optional(),

  /** MAESTRO E2E
   * When set to "1", unlocks dev-only endpoints used by the Maestro E2E
   * suite to mock RevenueCat purchase flows (RC's native purchase sheet
   * cannot be driven from CI simulators). This is gated BOTH by
   * NODE_ENV !== "production" AND this flag — belt + suspenders.
   * Never set in production environments. */
  MAESTRO_E2E: z.string().optional(),
});

const _config = configSchema.safeParse(process.env);

if (!_config.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables", _config.error.format());
  throw new Error("Invalid environment variables.");
}

export const config = _config.data;

/** Parsed list of magic emails (lowercased, trimmed). Empty if unset. */
export const getMagicEmails = (): string[] => {
  if (!config.APPLE_MAGIC_EMAIL) return [];
  return config.APPLE_MAGIC_EMAIL.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
};

/** Case-insensitive check: is `email` one of the configured magic emails? */
export const isMagicEmail = (email: string): boolean => {
  const list = getMagicEmails();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
};
