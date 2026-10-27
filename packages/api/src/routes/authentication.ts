import {
  REFERRAL_ID_REGEX,
  REFERRAL_REF_REGEX,
} from "@pegada/shared/utils/referral";
import { z } from "zod";

import { AuthenticationService } from "../services/authentication-service";
import { createTRPCRouter, publicProcedure } from "../trpc";

const authenticationBodySchema = z.object({
  email: z.string().email(),
  code: z.string().optional(),
  /**
   * Where this install came from: a shared dog card, or a channel link such
   * as the Instagram bio. `ref` is whatever was in the link; the service
   * decides whether it names a user or a channel.
   *
   * `.catch(undefined)` rather than a hard reject: these values travel through
   * chat apps, link previewers and store referrer strings, and a mangled one
   * is a lost attribution, not a login the user should be locked out of. The
   * regexes still run, so nothing unvalidated reaches a query.
   */
  referral: z
    .object({
      ref: z.string().regex(REFERRAL_REF_REGEX),
      referredDogId: z.string().regex(REFERRAL_ID_REGEX).optional(),
    })
    .optional()
    .catch(undefined),
  platform: z.enum(["ios", "android", "web"]).optional().catch(undefined),
});

export const authenticationRouter = createTRPCRouter({
  login: publicProcedure
    .input(authenticationBodySchema)
    .mutation(async ({ ctx, input }) => {
      // No "already logged in" refusal here. A token whose account was
      // deleted still verifies, the app lands on sign in for it (echo.get
      // says unauthenticated) and the keychain keeps it across reinstalls,
      // so refusing locked those people out for good. The rate limit that
      // refusal stood in for now covers login regardless of session (see
      // apps/nextjs/src/app/api/trpc/[trpc]/route.ts).
      const authenticationService = new AuthenticationService({
        language: ctx.language,
      });

      const user = await authenticationService.login({
        email: input.email,
        code: input.code,
        referral: input.referral,
        platform: input.platform,
      });

      const token = ctx.jwtSign({ sub: user.id });

      return { token };
    }),
});
