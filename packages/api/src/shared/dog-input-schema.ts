import { dogServerSchema } from "@pegada/shared/schemas/dog-schema";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { allowedImageOrigins, isAllowedImageUrl } from "./image-url";

export const FOREIGN_IMAGE_ORIGIN_MESSAGE =
  "Image URL does not point at a configured storage origin";

/**
 * `dogServerSchema` with every image URL pinned to a configured storage
 * origin. This is the schema `dog.create` accepts — a dog being created has no
 * stored images to compare against, so every URL in it is new.
 *
 * The host check can't live in @pegada/shared: that package is bundled into
 * the mobile app and has no access to server config, while the allowlist is
 * built from the API's own storage settings.
 */
export const dogInputSchema = dogServerSchema.extend({
  images: dogServerSchema.shape.images.superRefine((images, ctx) => {
    const origins = allowedImageOrigins();

    for (const [index, image] of images.entries()) {
      if (image.url && !isAllowedImageUrl(image.url, origins)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "url"],
          message: FOREIGN_IMAGE_ORIGIN_MESSAGE,
        });
      }
    }
  }),
});

/**
 * `myDog.update`'s schema. Shape only — the storage-origin check is deferred to
 * `assertDogImageOriginsAllowed`, which the mutation runs once it knows which
 * URLs the dog already has.
 *
 * It has to work that way. An update echoes the dog's *existing* photos back,
 * and a URL that is already in our database was accepted before the allowlist
 * did, or could, cover it: a storage migration (S3 -> R2) retires an origin,
 * and the dev/E2E fixtures were seeded from a third-party placeholder host. A
 * static schema can only see the request, so it rejected all of those and the
 * user was left unable to save their profile at all — the tour's "Unable to
 * save profile information".
 */
export const dogUpdateInputSchema = dogServerSchema.partial();

/**
 * Rejects image URLs that point at neither a configured storage origin nor a
 * URL already stored on the dog being updated.
 *
 * The security property is unchanged: the server still never accepts a *new*
 * foreign URL, so it never makes an outbound request on a caller's behalf to a
 * host they chose. Grandfathering only re-admits strings the server already
 * holds for that dog, and the update path does not re-download them —
 * `DogService.updateDog` enqueues PROCESS_IMAGE for newly created images only.
 */
export const assertDogImageOriginsAllowed = (
  images: readonly { url?: string | null }[] | undefined,
  storedUrls: ReadonlySet<string>,
) => {
  if (!images) return;

  const origins = allowedImageOrigins();

  const rejected = images.some(
    (image) =>
      Boolean(image.url) &&
      !storedUrls.has(image.url as string) &&
      !isAllowedImageUrl(image.url as string, origins),
  );

  if (rejected) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: FOREIGN_IMAGE_ORIGIN_MESSAGE,
    });
  }
};
