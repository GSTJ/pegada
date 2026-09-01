import type {
  Event,
  EventCancellation,
  EventExpiration,
  SubscriptionLifecycleEvent,
} from "../types/revenuecat";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { PlanType } from "@prisma/client";

import { captureEvent } from "../shared/analytics";
import { UserService } from "./user-service";

enum RevenueCatEntitlement {
  PREMIUM = "premium",
}

type RevenueCatEvent = {
  event: Event;
};

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
/**
 * Reads the fields a subscription event carries, when it carries them.
 *
 * TEST and TRANSFER have no product, price or period; the rest do. Widening the
 * union once here keeps the capture below a single call instead of a second
 * switch that would have to be kept in step with the first.
 */
type SubscriptionDetails = Partial<
  Omit<SubscriptionLifecycleEvent, "type"> &
    Pick<EventCancellation, "cancel_reason"> &
    Pick<EventExpiration, "expiration_reason">
>;

const readSubscriptionFields = (event: Event) => {
  const details: SubscriptionDetails = event;

  return {
    product_id: details.product_id ?? null,
    period_type: details.period_type ?? null,
    price: details.price ?? null,
    currency: details.currency ?? null,
    expiration: details.expiration_at_ms
      ? new Date(details.expiration_at_ms).toISOString()
      : null,
    // CANCELLATION calls it `cancel_reason`, EXPIRATION calls it
    // `expiration_reason`. Same question, so they share one column.
    cancel_reason: details.cancel_reason ?? details.expiration_reason ?? null,
  };
};

class PaymentService {
  handleRevenueCatEvent({ event }: RevenueCatEvent) {
    const { app_user_id: userID, type } = event;

    // Every type, before the switch, including the nine this service ignores.
    // Trial to paid conversion and cancellation rate are both questions about
    // the events no plan mutation reads, so capturing only the handled ones
    // would answer neither. Nothing below this line changes what the switch
    // does with the event.
    captureEvent(userID ?? "", ANALYTICS_EVENTS.SUBSCRIPTION_EVENT, {
      type,
      store: event.store,
      environment: event.environment,
      ...readSubscriptionFields(event),
    });

    switch (type) {
      case "TRANSFER": {
        return this.transferSubscription({
          transferredTo: event.transferred_to,
          transferredFrom: event.transferred_from,
        });
      }
      case "RENEWAL":
      case "INITIAL_PURCHASE": {
        if (isAnonymous(userID)) return;

        const plan = getPlanByEntitlements(event.entitlement_ids);
        return this.createSubscription({ userID, plan });
      }

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
    plan,
  }: {
    userID: string;
    plan: PlanType;
  }) {
    await UserService.updateUserById(userID, { plan });
  }

  async cancelSubscription({ userID }: { userID: string }) {
    await UserService.updateUserById(userID, {
      plan: PlanType.FREE,
    });
  }

  async transferSubscription({
    transferredFrom,
    transferredTo,
  }: {
    transferredFrom: string[];
    transferredTo: string[];
  }) {
    const transferredFromIds = findNonAnonymousUserIds(transferredFrom);
    const transferredToIds = findNonAnonymousUserIds(transferredTo);

    await prisma.$transaction([
      ...transferredFromIds.map((fromUserID) =>
        UserService.updateUserById(fromUserID, { plan: PlanType.FREE }),
      ),
      ...transferredToIds.map((toUserID) =>
        UserService.updateUserById(toUserID, { plan: PlanType.PREMIUM }),
      ),
    ]);
  }
}

export default PaymentService;
