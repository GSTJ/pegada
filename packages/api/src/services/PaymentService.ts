import { PlanType } from "@prisma/client";

import prisma from "@pegada/database";

import { Event } from "../types/revenuecat";
import { UserService } from "./UserService";

enum RevenueCatEntitlement {
  PREMIUM = "premium"
}

type RevenueCatEvent = { event: Event };

const isAnonymous = (alias: string) => alias.startsWith("$RCAnonymousID:");
const findNonAnonymousUserIds = (aliases: string[]): string[] => {
  return aliases.filter((alias) => !isAnonymous(alias));
};

const getPlanByEntitlements = (entitlements: string[] | null) => {
  for (const entitlement of entitlements ?? []) {
    if (entitlement === RevenueCatEntitlement.PREMIUM) {
      return PlanType.PREMIUM;
    }
  }

  return PlanType.FREE;
};
class PaymentService {
  async handleRevenueCatEvent({ event }: RevenueCatEvent) {
    const { app_user_id: userID, type } = event;

    switch (type) {
      case "TRANSFER": {
        return this.transferSubscription({
          transferredTo: event.transferred_to,
          transferredFrom: event.transferred_from
        });
      }
      case "RENEWAL":
      case "INITIAL_PURCHASE":
        if (isAnonymous(userID)) return;

        const plan = getPlanByEntitlements(event.entitlement_ids);
        return this.createSubscription({ userID, plan });

      case "EXPIRATION":
        if (isAnonymous(userID)) return;

        return this.cancelSubscription({ userID });

      // Ignore all others
      default:
        break;
    }
  }

  async createSubscription({
    userID,
    plan
  }: {
    userID: string;
    plan: PlanType;
  }) {
    await UserService.updateUserById(userID, { plan });
  }

  async cancelSubscription({ userID }: { userID: string }) {
    await UserService.updateUserById(userID, {
      plan: PlanType.FREE
    });
  }

  async transferSubscription({
    transferredFrom,
    transferredTo
  }: {
    transferredFrom: string[];
    transferredTo: string[];
  }) {
    const transferredFromIds = findNonAnonymousUserIds(transferredFrom);
    const transferredToIds = findNonAnonymousUserIds(transferredTo);

    await prisma.$transaction([
      ...transferredFromIds.map((fromUserID) =>
        UserService.updateUserById(fromUserID, { plan: PlanType.FREE })
      ),
      ...transferredToIds.map((toUserID) =>
        UserService.updateUserById(toUserID, { plan: PlanType.PREMIUM })
      )
    ]);
  }
}

export default PaymentService;
