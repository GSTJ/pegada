import { z } from "zod";

import { dogServerSchema } from "@pegada/shared/schemas/dog-schema";

import { allowedImageOrigins, isAllowedImageUrl } from "./image-url";

/**
 * `dogServerSchema` with every image URL pinned to a configured storage
 * origin. This is the schema the tRPC dog routes accept, and the only one
 * that should ever be wired to a mutation.
 *
 * The host check can't live in @pegada/shared: that package is bundled into
 * the mobile app and has no access to server config, while the allowlist is
 * built from the API's own storage settings.
 */
export const dogInputSchema = dogServerSchema.extend({
  images: dogServerSchema.shape.images.superRefine((images, ctx) => {
    const origins = allowedImageOrigins();

    images.forEach((image, index) => {
      if (!image.url || isAllowedImageUrl(image.url, origins)) return;

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "url"],
        message: "Image URL does not point at a configured storage origin",
      });
    });
  }),
});
