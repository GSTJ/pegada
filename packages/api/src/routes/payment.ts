import { PlanType } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import PaymentService from "../services/PaymentService";
import { config } from "../shared/config";
import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * Payment-related tRPC procedures.
 *
 * The `maestroGrantPremium` mutation is the ONE explicitly approved BE mock
 * used by the Maestro E2E suite. RevenueCat's native purchase sheet cannot
 * be driven from a simulator in CI; instead the upgrade journey flow
 * (`apps/mobile/.maestro/25-upgrade-journey.yaml`) routes the purchase tap
 * to this endpoint, which then updates the user's plan exactly the same
 * way the real RevenueCat webhook (`PaymentService.handleRevenueCatEvent`)
 * would on an `INITIAL_PURCHASE` event.
 *
 * Belt + suspenders: gated on BOTH `NODE_ENV !== "production"` AND
 * `MAESTRO_E2E === "1"`. Refuses to run if either condition fails. There
 * is no path by which this can mutate state in production.
 */
const ensureMaestroEnvironment = () => {
  if (config.NODE_ENV === "production") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Maestro endpoints are disabled in production",
    });
  }

  if (config.MAESTRO_E2E !== "1") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Maestro endpoints require MAESTRO_E2E=1",
    });
  }
};

export const paymentRouter = createTRPCRouter({
  maestroGrantPremium: protectedProcedure.mutation(async ({ ctx }) => {
    ensureMaestroEnvironment();

    const userID = ctx.session.user.id;
    const paymentService = new PaymentService();
    await paymentService.createSubscription({ userID, plan: PlanType.PREMIUM });

    return { granted: true, plan: PlanType.PREMIUM };
  }),
});
