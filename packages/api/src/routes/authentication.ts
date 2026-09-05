import {
  REFERRAL_ID_REGEX,
  REFERRAL_REF_REGEX,
} from "@pegada/shared/utils/referral";
import { TRPCError } from "@trpc/server";
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
      const alreadyLoggedIn = Boolean(ctx.session?.user.id);

      // Prevents malicious users from exploiting the lack of
      // rate limiting for logged in users
      //
      // Coded, not a bare Error: an uncoded throw leaves tRPC no choice but
      // INTERNAL_SERVER_ERROR, and the app retries an uncoded 5xx twice (see
      // apps/mobile/src/services/transient-retry.ts). One tap by someone who
      // already had a session cost three requests and logged three
      // exceptions. CONFLICT maps to 409, which the client treats as final.
      if (alreadyLoggedIn) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already logged in",
        });
      }

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
