import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),

  /** DEV */
  QUEUE_DEV_PORT: z.coerce.number().optional(),

  /** EXPO */
  EXPO_ACCESS_TOKEN: z.string()
});

const _config = configSchema.safeParse(process.env);

if (_config.success === false) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment variables", _config.error.format());
  throw new Error("Invalid environment variables.");
}

export const config = _config.data;
