import { ImageService } from "../services/image-service";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { signedUploadInputSchema } from "./input-schemas";

export const imageRouter = createTRPCRouter({
  /**
   * LEGACY — shipped binaries call this and strip the query string off the
   * response to derive the public URL. Response shape (bare string) and
   * backing storage (S3) are frozen until those binaries are sunset via
   * MIN_APP_VERSION. New code uses `signedUpload`.
   */
  signedUrl: protectedProcedure.query(async ({ ctx }) => {
    const presignedUrl = await ImageService.getSignedUrl(ctx.session.user.id);
    return presignedUrl.url;
  }),

  /** Storage-agnostic upload descriptor — see `SignedUpload` in ImageService. */
  signedUpload: protectedProcedure
    .input(signedUploadInputSchema.optional())
    .query(({ ctx, input }) =>
      ImageService.getSignedUpload(ctx.session.user.id, input),
    ),
});
