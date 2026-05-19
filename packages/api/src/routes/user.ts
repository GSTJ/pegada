import { z } from "zod";

import { UserService } from "../services/UserService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userSchema = z.object({
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  pushToken: z.string().optional().nullable(),
});

export const userRouter = createTRPCRouter({
  update: protectedProcedure.input(userSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const updatedDog = await UserService.updateUserById(userId, input);
    return updatedDog;
  }),

  /**
   * Hard-delete the current user's account and every dependent record.
   * Required for App Store compliance (Guideline 5.1.1(v)).
   */
  deleteMe: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    await UserService.deleteAccount(userId);
    return { ok: true };
  }),
});
