import { MAX_IMAGE_BYTES } from "@pegada/shared/constants/constants";
import { z } from "zod";

/**
 * Ids in this database do not share one format. Prisma mints cuids for Dog and
 * User and uuids for Match and Message, and the rows carried over from the
 * previous system have ids in neither shape, so a format specific check like
 * `.uuid()` or `.cuid()` rejects real traffic from real people. Bound the
 * length and the alphabet instead and let the lookup decide whether the row
 * exists.
 */
export const recordIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const signedUploadInputSchema = z.object({
  contentLength: z.number().int().min(1).max(MAX_IMAGE_BYTES),
  contentType: z.literal("image/webp"),
});

export const messageListInputSchema = z.object({
  matchId: recordIdSchema,
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  gt: z.coerce.date().optional(),
  lt: z.coerce.date().optional(),
});

export const messageSendInputSchema = z.object({
  matchId: recordIdSchema,
  content: z.string().trim().min(1).max(2_000),
});

export const messageDeleteInputSchema = z.object({
  messageId: recordIdSchema,
});

export const swipeQueryInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  notIn: z.array(recordIdSchema).max(500).optional(),
});

export const swipeInputSchema = z.object({
  id: recordIdSchema,
  swipeType: z.enum(["NOT_INTERESTED", "MAYBE", "INTERESTED"]),
});
