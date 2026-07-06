import { ImageService } from "../services/ImageService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const imageRouter = createTRPCRouter({
  /**
   * LEGACY — shipped binaries call this and strip the query string off the
   * response to derive the public URL. Response shape (bare string) and
   * backing storage (S3) are frozen until those binaries are sunset via
   * MIN_APP_VERSION. New code uses `signedUpload`.
   */
  signedUrl: protectedProcedure.query(async () => {
    const presignedUrl = await ImageService.getSignedUrl();
    return presignedUrl.url;
  }),

  /** Storage-agnostic upload descriptor — see `SignedUpload` in ImageService. */
  signedUpload: protectedProcedure.query(async () => {
    return ImageService.getSignedUpload();
  }),
});
