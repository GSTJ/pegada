import type { Event } from "../types/revenuecat";

import prisma from "@pegada/database";
import { PlanType } from "@prisma/client";

import { sendError } from "../errors/errors";
import * as revenuecat from "./__fixtures__/revenuecat-events";
import PaymentService from "./payment-service";

// `errors.ts` pulls in `observability.ts` -> the ESM-only
// `magic-observability/node`, which jest can't parse. Same mock the other
// service suites use.
jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

const reportedError = jest.mocked(sendError);
const paymentService = new PaymentService();

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.subscriptionEvent.deleteMany();
  await prisma.uploadGrant.deleteMany();
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
});

const seedSubscriber = (email: string, plan: PlanType = PlanType.PREMIUM) =>
  prisma.user.create({ data: { email, plan } });

/** One recorded payload per type the webhook can receive. */
const everyEventType = (subscriberId: string, previousOwnerId: string) => [
  revenuecat.trialStart("evt_trial_start", subscriberId),
  revenuecat.initialPurchase("evt_initial_purchase", subscriberId),
  revenuecat.renewal("evt_renewal", subscriberId),
  revenuecat.trialConversion("evt_trial_conversion", subscriberId),
  revenuecat.cancellation("evt_cancellation", subscriberId),
  revenuecat.refund("evt_refund", subscriberId),
  revenuecat.uncancellation("evt_uncancellation", subscriberId),
  revenuecat.expiration("evt_expiration", subscriberId),
  revenuecat.productChange("evt_product_change", subscriberId),
  revenuecat.billingIssue("evt_billing_issue", subscriberId),
  revenuecat.subscriptionPaused("evt_subscription_paused", subscriberId),
  revenuecat.nonRenewingPurchase("evt_non_renewing", subscriberId),
  revenuecat.transfer("evt_transfer", [previousOwnerId], [subscriberId]),
  revenuecat.testEvent("evt_test"),
];

describe("SubscriptionEventService log", () => {
  it("records exactly one row for every event type RevenueCat sends", async () => {
    const [subscriber, previousOwner] = await Promise.all([
      seedSubscriber("every-type@pegada.app"),
      seedSubscriber("every-type-previous@pegada.app"),
    ]);
    const events = everyEventType(subscriber.id, previousOwner.id);

    for (const event of events) {
      // oxlint-disable-next-line no-await-in-loop -- The webhook delivers one event at a time, and a TRANSFER has to land after the purchase it moves.
      await paymentService.handleRevenueCatEvent(
        revenuecat.webhookPayload(event),
      );
    }

    const recorded = await prisma.subscriptionEvent.findMany();

    expect(recorded).toHaveLength(events.length);
    expect(recorded.map((row) => row.eventId).sort()).toEqual(
      events.map((event) => event.id).sort(),
    );
    expect(reportedError).not.toHaveBeenCalled();
  });

  it("stores the documented fields of a purchase and attributes it to the user", async () => {
    const subscriber = await seedSubscriber("fields@pegada.app");

    await paymentService.handleRevenueCatEvent({
      event: revenuecat.initialPurchase("evt_fields", subscriber.id),
    });

    await expect(
      prisma.subscriptionEvent.findUniqueOrThrow({
        where: { eventId: "evt_fields" },
      }),
    ).resolves.toMatchObject({
      type: "INITIAL_PURCHASE",
      userId: subscriber.id,
      productId: revenuecat.PRODUCT_ID,
      periodType: "NORMAL",
      store: "APP_STORE",
      environment: "PRODUCTION",
      price: 19.9,
      currency: "BRL",
      purchasedAt: new Date(revenuecat.PURCHASED_AT_MS),
      expirationAt: new Date(revenuecat.EXPIRATION_AT_MS),
      raw: expect.objectContaining({ id: "evt_fields" }),
    });
  });

  it("stores the cancel reason of a cancellation", async () => {
    const subscriber = await seedSubscriber("reason@pegada.app");

    await paymentService.handleRevenueCatEvent({
      event: revenuecat.refund("evt_reason", subscriber.id),
    });

    await expect(
      prisma.subscriptionEvent.findUniqueOrThrow({
        where: { eventId: "evt_reason" },
      }),
    ).resolves.toMatchObject({ cancelReason: "CUSTOMER_SUPPORT" });
  });

  it("does not write twice when RevenueCat retries the same event", async () => {
    const subscriber = await seedSubscriber("retry@pegada.app");
    const event = revenuecat.renewal("evt_retried", subscriber.id);

    await paymentService.handleRevenueCatEvent({ event });
    await expect(
      paymentService.handleRevenueCatEvent({ event }),
    ).resolves.not.toThrow();

    await expect(
      prisma.subscriptionEvent.count({ where: { eventId: "evt_retried" } }),
    ).resolves.toBe(1);
    expect(reportedError).not.toHaveBeenCalled();
  });

  it("leaves the row unattributed when the subscriber is anonymous", async () => {
    await paymentService.handleRevenueCatEvent({
      event: revenuecat.trialStart(
        "evt_anonymous",
        "$RCAnonymousID:8f9a0b1c2d3e4f50",
      ),
    });

    await expect(
      prisma.subscriptionEvent.findUniqueOrThrow({
        where: { eventId: "evt_anonymous" },
      }),
    ).resolves.toMatchObject({ userId: null, periodType: "TRIAL" });
  });

  it("still applies the plan change when the log write fails", async () => {
    const subscriber = await seedSubscriber("log-down@pegada.app");
    const upsert = jest
      .spyOn(prisma.subscriptionEvent, "upsert")
      .mockRejectedValue(new Error("subscription log unavailable"));

    try {
      await paymentService.handleRevenueCatEvent({
        event: revenuecat.expiration("evt_log_down", subscriber.id),
      });
    } finally {
      upsert.mockRestore();
    }

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: subscriber.id } }),
    ).resolves.toMatchObject({ plan: PlanType.FREE });
    expect(reportedError).toHaveBeenCalled();
  });
});

describe("SubscriptionEventService alongside the plan changes", () => {
  it("keeps a cancelled subscriber on premium until the period ends", async () => {
    const subscriber = await seedSubscriber("cancels@pegada.app");

    await paymentService.handleRevenueCatEvent({
      event: revenuecat.cancellation("evt_cancels", subscriber.id),
    });

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: subscriber.id } }),
    ).resolves.toMatchObject({ plan: PlanType.PREMIUM });
  });

  it("downgrades to free once the subscription expires", async () => {
    const subscriber = await seedSubscriber("expires@pegada.app");

    await paymentService.handleRevenueCatEvent({
      event: revenuecat.expiration("evt_expires", subscriber.id),
    });

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: subscriber.id } }),
    ).resolves.toMatchObject({ plan: PlanType.FREE });
  });
});

type EventBuilder = (id: string, appUserId: string) => Event;

const paidThroughCases: [string, EventBuilder][] = [
  ["purchase", revenuecat.initialPurchase],
  ["renewal", revenuecat.renewal],
  ["product-change", revenuecat.productChange],
  ["uncancellation", revenuecat.uncancellation],
];

describe("SubscriptionEventService paid-through date", () => {
  it.each(paidThroughCases)(
    "records how long the subscriber is paid for after a %s",
    async (label, buildEvent) => {
      const subscriber = await seedSubscriber(
        `paid-through-${label}@pegada.app`,
        PlanType.FREE,
      );

      await paymentService.handleRevenueCatEvent({
        event: buildEvent("evt_paid_through", subscriber.id),
      });

      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: subscriber.id } }),
      ).resolves.toMatchObject({
        premiumUntil: new Date(revenuecat.EXPIRATION_AT_MS),
      });
    },
  );

  it("leaves the paid-through date alone when the store sends no expiry", async () => {
    const subscriber = await seedSubscriber("no-expiry@pegada.app");

    await paymentService.handleRevenueCatEvent({
      event: revenuecat.renewal("evt_no_expiry", subscriber.id, {
        expiration_at_ms: null,
      }),
    });

    await expect(
      prisma.user.findUniqueOrThrow({ where: { id: subscriber.id } }),
    ).resolves.toMatchObject({ premiumUntil: null });
  });
});
