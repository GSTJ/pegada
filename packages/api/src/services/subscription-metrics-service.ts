import prisma from "@pegada/database";

/**
 * The only `cancel_reason` RevenueCat documents as money going back: "Customer
 * received a refund from Apple support, a Google Play subscription was
 * refunded through RevenueCat, an Amazon subscription was refunded through
 * Amazon support, or a web subscription was refunded." Every other reason,
 * `UNSUBSCRIBE` above all, is a subscriber turning auto renew off and keeping
 * access until the period ends, which is a cancellation and not a refund.
 * https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
const REFUND_CANCEL_REASONS = ["CUSTOMER_SUPPORT"];

export type SubscriptionMetrics = {
  trialStarts: number;
  trialConversions: number;
  renewals: number;
  cancellations: number;
  expirations: number;
  refunds: number;
};

export type SubscriptionMetricsOptions = {
  from: Date;
  to: Date;
  /**
   * Sandbox events come from our own devices and from store review, so they
   * are out of the numbers unless someone is deliberately checking the
   * pipeline works end to end.
   */
  includeSandbox?: boolean;
};

/**
 * Counts the subscription lifecycle for a window, from the events the
 * RevenueCat webhook has been appending. Answers the M2 questions the
 * RevenueCat dashboard cannot: how many trials we start, how many of them pay,
 * and how the paid ones end.
 */
export const getSubscriptionMetrics = async ({
  from,
  to,
  includeSandbox = false,
}: SubscriptionMetricsOptions): Promise<SubscriptionMetrics> => {
  // The window is on `createdAt`, the moment the webhook reached us, not on
  // `purchasedAt`. A CANCELLATION carries the *original* purchase date, so
  // filtering on it would file this month's cancellation under the month the
  // subscriber first paid.
  const window = { createdAt: { gte: from, lte: to } };
  const environment = includeSandbox ? {} : { NOT: { environment: "SANDBOX" } };
  const scope = { ...window, ...environment };

  const [
    trialStarts,
    trialConversions,
    renewals,
    expirations,
    refunds,
    allCancellations,
  ] = await Promise.all([
    prisma.subscriptionEvent.count({
      where: { ...scope, type: "INITIAL_PURCHASE", periodType: "TRIAL" },
    }),
    prisma.subscriptionEvent.count({
      where: {
        ...scope,
        type: "RENEWAL",
        // RevenueCat's documented conversion signal: `is_trial_conversion` is
        // "whether the previous period was a free trial", and it is sent on
        // RENEWAL only. Comparing period types across a user's own history
        // would miss the subscribers who trialled before we started logging.
        raw: { path: ["is_trial_conversion"], equals: true },
      },
    }),
    prisma.subscriptionEvent.count({
      where: { ...scope, type: "RENEWAL", periodType: "NORMAL" },
    }),
    prisma.subscriptionEvent.count({
      where: { ...scope, type: "EXPIRATION" },
    }),
    prisma.subscriptionEvent.count({
      where: {
        ...scope,
        type: "CANCELLATION",
        cancelReason: { in: REFUND_CANCEL_REASONS },
      },
    }),
    prisma.subscriptionEvent.count({
      where: { ...scope, type: "CANCELLATION" },
    }),
  ]);

  return {
    trialStarts,
    // A subset of `renewals`: a converting renewal is also a NORMAL renewal.
    trialConversions,
    renewals,
    cancellations: allCancellations - refunds,
    expirations,
    refunds,
  };
};
