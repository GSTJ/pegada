import type {
  Event,
  EventCancellation,
  EventExpiration,
  SubscriptionLifecycleEvent,
} from "../types/revenuecat";
import type { Prisma } from "@prisma/client";

import prisma from "@pegada/database";

import { sendError } from "../errors/errors";
import { UserService } from "./user-service";

export const isAnonymous = (alias: string) =>
  alias.startsWith("$RCAnonymousID:");

export const findNonAnonymousUserIds = (aliases: string[]): string[] => {
  return aliases.filter((alias) => !isAnonymous(alias));
};

/**
 * Event types after which the store has told us how long the subscriber is
 * paid through. `plan` stays the entitlement source of truth; `premiumUntil`
 * only records the date, so churn reporting can see a renewal coming.
 */
const PAID_THROUGH_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
]);

/**
 * TEST and TRANSFER events carry none of the subscription fields, and
 * `cancel_reason` and `expiration_reason` each live on one type only, so the
 * union has to be widened before the log can read whatever happens to be
 * there. Every field is optional on purpose: a type RevenueCat adds later is
 * recorded with whatever it sends instead of crashing the webhook.
 */
type LoggableEvent = Partial<SubscriptionLifecycleEvent> &
  Partial<Pick<EventCancellation, "cancel_reason">> &
  Partial<Pick<EventExpiration, "expiration_reason">>;

const toDate = (milliseconds: number | null | undefined) =>
  milliseconds ? new Date(milliseconds) : null;

/**
 * The reporting half of the RevenueCat webhook. Nothing in here decides
 * whether a subscriber has premium, so nothing in here is allowed to throw:
 * `record` catches everything and reports it, leaving the plan mutation in
 * `PaymentService` to run either way.
 */
export class SubscriptionEventService {
  static async record({ event }: { event: Event }) {
    await SubscriptionEventService.append(event);
    await SubscriptionEventService.syncPaidThrough(event);
  }

  /**
   * Appends every webhook event, including the ones that change nothing, so
   * trial conversion, churn and refunds can be counted against our own users.
   * Keyed on the RevenueCat event id, so the retries RevenueCat sends after a
   * timeout land on the same row instead of inflating the counts.
   */
  private static async append(event: Event) {
    try {
      const fields = event as LoggableEvent;

      await prisma.subscriptionEvent.upsert({
        where: { eventId: event.id },
        // Already recorded: the first delivery won, nothing to change.
        update: {},
        create: {
          eventId: event.id,
          type: event.type,
          userId: await SubscriptionEventService.resolveUserId(event),
          productId: fields.product_id ?? null,
          periodType: fields.period_type ?? null,
          store: event.store,
          // `price` is null on stores that do not report it, and RevenueCat
          // documents `price_in_purchased_currency` as the fallback.
          price: fields.price ?? fields.price_in_purchased_currency ?? null,
          currency: fields.currency ?? null,
          purchasedAt: toDate(fields.purchased_at_ms),
          expirationAt: toDate(fields.expiration_at_ms),
          // CANCELLATION carries `cancel_reason`, EXPIRATION carries
          // `expiration_reason`; both answer the same question.
          cancelReason:
            fields.cancel_reason ?? fields.expiration_reason ?? null,
          environment: event.environment,
          raw: event as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      sendError(error, {
        scope: "subscription-event-service.append",
        revenueCatEventId: event.id,
        revenueCatEventType: event.type,
      });
    }
  }

  /**
   * The webhook identifies subscribers by our own user id, so the mapping is
   * an existence check. Anonymous and unknown ids still get a row, just an
   * unattributed one, because the aggregate counts still matter.
   */
  private static async resolveUserId(event: Event) {
    // A TRANSFER names no `app_user_id`; the account that ends up holding the
    // subscription is the one the event belongs to.
    const candidate =
      event.type === "TRANSFER"
        ? findNonAnonymousUserIds(event.transferred_to)[0]
        : event.app_user_id;

    if (!candidate || isAnonymous(candidate)) return null;

    const user = await prisma.user.findUnique({
      where: { id: candidate },
      select: { id: true },
    });

    return user?.id ?? null;
  }

  private static async syncPaidThrough(event: Event) {
    try {
      if (!PAID_THROUGH_EVENT_TYPES.has(event.type)) return;

      const { expiration_at_ms: expirationAtMs } = event as LoggableEvent;
      const paidThrough = toDate(expirationAtMs);
      const userID = event.app_user_id;

      if (!paidThrough || !userID || isAnonymous(userID)) return;

      await UserService.updateUserById(userID, { premiumUntil: paidThrough });
    } catch (error) {
      sendError(error, {
        scope: "subscription-event-service.syncPaidThrough",
        revenueCatEventId: event.id,
        revenueCatEventType: event.type,
      });
    }
  }
}
