import { RequestHeaders } from "@pegada/shared/types/types";

import { appPlatformSchema, EchoService } from "../services/echo-service";
import { semverSchema } from "../shared/config";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const echoRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.req) throw new Error("Missing request data");

    // Both headers are read leniently. They come off a client, and an old
    // build that predates the platform header, or a version string a store
    // rewrote, must not turn the one query every launch waits on into a 500.
    // Unreadable means unset, and unset means no gate.
    const currentAppVersion = semverSchema.safeParse(
      ctx.req.headers.get(RequestHeaders.XAppVersion),
    ).data;

    const platform = appPlatformSchema.safeParse(
      ctx.req.headers.get(RequestHeaders.XAppPlatform),
    ).data;

    const { authenticated, forceUpdate, minimumSupportedVersion } =
      await EchoService.get({
        currentAppVersion,
        platform,
        userId: ctx.session?.user.id,
      });

    return { authenticated, forceUpdate, minimumSupportedVersion };
  }),
});
