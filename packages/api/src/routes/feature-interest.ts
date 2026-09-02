import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * The fake doors currently shipped in the app. Kept as a zod enum rather
 * than a free-form string so a typo in a client build cannot quietly create
 * a bucket of interest nobody ever reads, and so the readout only ever has
 * to group by ids that exist.
 */
export const featureInterestIdSchema = z.enum([
  "referral_reward",
  "ai_story_video",
]);

export type FeatureInterestId = z.infer<typeof featureInterestIdSchema>;

const setInterestSchema = z.object({
  feature: featureInterestIdSchema,
  interested: z.boolean(),
});

export const featureInterestRouter = createTRPCRouter({
  /**
   * Records or clears the "notify me" intent behind a fake door. Interest is
   * a row's presence, so turning the toggle off deletes the row instead of
   * flipping a boolean: the table then reads as the waiting list it is, and
   * counting demand for a feature is a `count` with no filter.
   */
  set: protectedProcedure
    .input(setInterestSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if (!input.interested) {
        // `deleteMany`, not `delete`: untoggling something that was never
        // toggled on (a double tap, a retried request) is a no-op, not a
        // "record not found" error.
        await ctx.db.featureInterest.deleteMany({
          where: { userId, feature: input.feature },
        });

        return { feature: input.feature, interested: false };
      }

      await ctx.db.featureInterest.upsert({
        where: { userId_feature: { userId, feature: input.feature } },
        create: { userId, feature: input.feature },
        update: {},
      });

      return { feature: input.feature, interested: true };
    }),

  /**
   * The features this user already asked to be notified about, so a sheet
   * that reopens shows the toggle the way the user left it. Returns bare ids
   * rather than rows: the client only needs membership, and the timestamps
   * are for the readout.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.featureInterest.findMany({
      where: { userId: ctx.session.user.id },
      select: { feature: true },
    });

    return rows.map((row) => row.feature);
  }),
});
