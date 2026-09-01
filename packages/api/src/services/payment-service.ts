import type {
  CancellationExpirationReason,
  Environment,
  Event,
  EventCancellation,
  EventExpiration,
  EventType,
  PeriodType,
  StoreKind,
  SubscriptionLifecycleEvent,
} from "../types/revenuecat";
import type {
  SubscriptionCancelReason,
  SubscriptionEnvironment,
  SubscriptionEventType,
  SubscriptionPeriodType,
  SubscriptionStore,
} from "@pegada/shared/analytics/events";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { PlanType } from "@prisma/client";

import { captureEvent } from "../shared/analytics";
import {
  findNonAnonymousUserIds,
  isAnonymous,
  SubscriptionEventService,
} from "./subscription-event-service";
import { UserService } from "./user-service";

enum RevenueCatEntitlement {
  PREMIUM = "premium",
}

type RevenueCatEvent = {
  event: Event;
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
 * Holds the catalogue's copy of the RevenueCat unions to the real ones.
 *
 * `@pegada/shared` cannot import from `@pegada/api` — it is the dependency, not
 * the dependent — so the catalogue restates these types. This is the assertion
 * that makes the copy safe: add a store or a cancellation reason to
 * `types/revenuecat.ts` and this file stops compiling until the catalogue
 * learns about it too. Types only, nothing at runtime.
 */
type AssertSame<A extends B, B> = A;

export type AssertCatalogueMatchesRevenueCat = [
  AssertSame<EventType, SubscriptionEventType>,
  AssertSame<SubscriptionEventType, EventType>,
  AssertSame<PeriodType, SubscriptionPeriodType>,
  AssertSame<SubscriptionPeriodType, PeriodType>,
  AssertSame<StoreKind, SubscriptionStore>,
  AssertSame<SubscriptionStore, StoreKind>,
  AssertSame<Environment, SubscriptionEnvironment>,
  AssertSame<SubscriptionEnvironment, Environment>,
  AssertSame<CancellationExpirationReason, SubscriptionCancelReason>,
  AssertSame<SubscriptionCancelReason, CancellationExpirationReason>,
];

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
    // RevenueCat's `price` is always USD, whatever `currency` says; the amount
    // that actually matches `currency` is `price_in_purchased_currency`. Named
    // apart so nobody sums the two into a revenue number that is neither.
    price_usd: details.price ?? null,
    price_in_purchased_currency: details.price_in_purchased_currency ?? null,
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
  async handleRevenueCatEvent({ event }: RevenueCatEvent) {
    // Reporting only, and it swallows its own failures, so a broken
    // subscription log can never cost a subscriber their entitlement.
    await SubscriptionEventService.record({ event });

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
