import { z } from "zod";

import { AuthenticationService } from "../services/AuthenticationService";
import { createTRPCRouter, publicProcedure } from "../trpc";

const authenticationBodySchema = z.object({
  email: z.string().email(),
  code: z.string().optional()
});

export const authenticationRouter = createTRPCRouter({
  login: publicProcedure
    .input(authenticationBodySchema)
    .mutation(async ({ ctx, input }) => {
      const alreadyLoggedIn = Boolean(ctx.session?.user.id);

      // Prevents malicious users from exploiting the lack of
      // rate limiting for logged in users
      if (alreadyLoggedIn) {
        throw new Error("Already logged in");
      }

      const authenticationService = new AuthenticationService({
        language: ctx.language
      });

      const user = await authenticationService.login({
        email: input.email,
        code: input.code
      });

      const token = ctx.jwtSign({ sub: user.id });

      return { token };
    })
});
