import { MAX_IMAGE_BYTES } from "@pegada/shared/constants/constants";
import { z } from "zod";

export const signedUploadInputSchema = z.object({
  contentLength: z.number().int().min(1).max(MAX_IMAGE_BYTES),
  contentType: z.literal("image/webp"),
});

export const messageListInputSchema = z.object({
  matchId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  gt: z.coerce.date().optional(),
  lt: z.coerce.date().optional(),
});

export const messageSendInputSchema = z.object({
  matchId: z.string().uuid(),
  content: z.string().trim().min(1).max(2_000),
});

export const messageDeleteInputSchema = z.object({
  messageId: z.string().uuid(),
});

export const swipeQueryInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  notIn: z.array(z.string().cuid()).max(500).optional(),
});

export const swipeInputSchema = z.object({
  id: z.string().cuid(),
  swipeType: z.enum(["NOT_INTERESTED", "MAYBE", "INTERESTED"]),
});
