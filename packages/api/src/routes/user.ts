import { z } from "zod";

import { UserService } from "../services/user-service";
import {
  authenticatedProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";

export const userSchema = z.object({
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  pushToken: z.string().optional().nullable(),
});

export const userRouter = createTRPCRouter({
  update: protectedProcedure
    .input(userSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const updatedUser = await UserService.updateUserById(userId, input);

      // `lastActiveAt` is written by the authenticated middleware for
      // retention reporting and has no meaning in the app, so it stops here
      // rather than riding along in the one procedure that returns a whole
      // user row. Prisma 5.17 has no top-level `omit`, hence the destructure.
      const { lastActiveAt: _lastActiveAt, ...user } = updatedUser;

      return user;
    }),

  /**
   * Interest signal from the empty swipe deck: the user wants to hear about it
   * when a new dog turns up. Nothing sends that alert yet, so this only stores
   * the intent and the share of empty-deck viewers who tap decides whether the
   * alert is worth building.
   */
  requestNewDogsAlert: protectedProcedure.mutation(({ ctx }) => {
    const userId = ctx.session.user.id;
    return UserService.requestNewDogsAlert(userId);
  }),

  /**
   * Hard-delete the current user's account and every dependent record.
   * Required for App Store compliance (Guideline 5.1.1(v)).
   */
  deleteMe: authenticatedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    await UserService.deleteAccount(userId);
    return { ok: true };
  }),
});
