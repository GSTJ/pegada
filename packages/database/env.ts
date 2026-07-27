import { z } from "zod";

/**
 * The one place this package reads the environment. Everything else imports
 * from here, which is what keeps `no-restricted-properties` honest.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export const env = envSchema.parse(process.env);
