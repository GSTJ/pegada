import { ImageService } from "../services/ImageService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const imageRouter = createTRPCRouter({
  signedUrl: protectedProcedure.query(async () => {
    const presignedUrl = await ImageService.getSignedUrl();
    return presignedUrl.url;
  })
});
