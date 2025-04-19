import semver from "semver";
import { z } from "zod";

export const semverSchema = z.string().refine((version) => {
  const isValid = semver.valid(version);
  if (!isValid) throw new Error("Invalid version");

  return isValid;
});

const configSchema = z.object({
  /** GENERAL */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  /** LOGGING */
  BUGSNAG_API_KEY: z.string(),

  /** POSTHOG */
  POSTHOG_API_KEY: z.string(),
  POSTHOG_HOST: z.string(),

  /** REDIS */
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),
  REDIS_PASSWORD: z.string(),
  REDIS_USERNAME: z.string(),

  /** SERVER */
  PORT: z.coerce.number().default(3009),

  /** AUTH */
  JWT_SECRET: z.string(),

  /** AWS */
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),

  /** MAIL */
  MAIL_USER: z.string(),
  MAIL_NAME: z.string(),
  SENDGRID_API_KEY: z.string(),

  /** APP */
  MIN_APP_VERSION: semverSchema,

  /** APPLE MAGIC */
  APPLE_MAGIC_EMAIL: z.string().optional(),
  APPLE_MAGIC_CODE: z.string().optional()
});

const _config = configSchema.safeParse(process.env);

if (!_config.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables", _config.error.format());
  throw new Error("Invalid environment variables.");
}

export const config = _config.data;
