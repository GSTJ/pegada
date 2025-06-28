import { RequestHeaders } from "@pegada/shared/types/types";

import { EchoService } from "../services/EchoService";
import { semverSchema } from "../shared/config";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const echoRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.req) throw new Error("Missing request data");

    const appVersionHeader = ctx.req.headers.get(RequestHeaders.XAppVersion);
    const currentAppVersion = semverSchema.parse(appVersionHeader);

    const { authenticated, forceUpdate } = await EchoService.get(
      currentAppVersion,
      ctx.session?.user.id
    );

    return { authenticated, forceUpdate };
  })
});
