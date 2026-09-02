import type { Event } from "../types/revenuecat";

import prisma from "@pegada/database";
import { PlanType } from "@prisma/client";

import * as revenuecat from "./__fixtures__/revenuecat-events";
import PaymentService from "./payment-service";
import { getSubscriptionMetrics } from "./subscription-metrics-service";

jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

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

const ingest = async (events: Event[]) => {
  for (const event of events) {
    // oxlint-disable-next-line no-await-in-loop -- The webhook delivers one event at a time, and the counts depend on that order.
    await paymentService.handleRevenueCatEvent({ event });
  }
};

/** Wide enough that everything the suite ingests falls inside it. */
const wholeWindow = {
  from: new Date(Date.now() - 60 * 60 * 1000),
  to: new Date(Date.now() + 60 * 60 * 1000),
};

describe("getSubscriptionMetrics", () => {
  it("counts the lifecycle of a mixed month", async () => {
    const subscriber = await prisma.user.create({
      data: { email: "metrics@pegada.app", plan: PlanType.PREMIUM },
    });

    await ingest([
      revenuecat.trialStart("evt_trial_1", subscriber.id),
      revenuecat.trialStart("evt_trial_2", subscriber.id),
      revenuecat.trialStart("evt_trial_3", subscriber.id),
      revenuecat.trialConversion("evt_conversion_1", subscriber.id),
      revenuecat.trialConversion("evt_conversion_2", subscriber.id),
      revenuecat.renewal("evt_renewal_1", subscriber.id),
      revenuecat.cancellation("evt_cancellation_1", subscriber.id),
      revenuecat.cancellation("evt_cancellation_2", subscriber.id),
      revenuecat.refund("evt_refund_1", subscriber.id),
      revenuecat.expiration("evt_expiration_1", subscriber.id),
      // Neither of these belongs in any of the six counts.
      revenuecat.billingIssue("evt_billing_1", subscriber.id),
      revenuecat.testEvent("evt_test_1"),
    ]);

    await expect(getSubscriptionMetrics(wholeWindow)).resolves.toEqual({
      trialStarts: 3,
      // The two conversions are NORMAL renewals too, so they are counted in
      // `renewals` as well as here.
      trialConversions: 2,
      renewals: 3,
      cancellations: 2,
      expirations: 1,
      refunds: 1,
    });
  });

  it("leaves out events from outside the window", async () => {
    const subscriber = await prisma.user.create({
      data: { email: "window@pegada.app" },
    });

    await ingest([revenuecat.trialStart("evt_outside", subscriber.id)]);

    const lastMonth = {
      from: new Date("2026-07-01T00:00:00.000Z"),
      to: new Date("2026-07-31T23:59:59.999Z"),
    };

    await expect(getSubscriptionMetrics(lastMonth)).resolves.toMatchObject({
      trialStarts: 0,
      renewals: 0,
    });
  });

  it("leaves out sandbox events unless they are asked for", async () => {
    const subscriber = await prisma.user.create({
      data: { email: "sandbox@pegada.app" },
    });

    await ingest([
      revenuecat.initialPurchase("evt_sandbox", subscriber.id, {
        period_type: "TRIAL",
        environment: "SANDBOX",
      }),
      revenuecat.trialStart("evt_production", subscriber.id),
    ]);

    await expect(getSubscriptionMetrics(wholeWindow)).resolves.toMatchObject({
      trialStarts: 1,
    });
    await expect(
      getSubscriptionMetrics({ ...wholeWindow, includeSandbox: true }),
    ).resolves.toMatchObject({ trialStarts: 2 });
  });

  it("still counts an event that arrived without an environment", async () => {
    await prisma.subscriptionEvent.create({
      data: {
        eventId: "evt_no_environment",
        type: "EXPIRATION",
        environment: null,
        raw: {},
      },
    });

    await expect(getSubscriptionMetrics(wholeWindow)).resolves.toMatchObject({
      expirations: 1,
    });
  });

  it("returns zeroes when nothing happened", async () => {
    await expect(getSubscriptionMetrics(wholeWindow)).resolves.toEqual({
      trialStarts: 0,
      trialConversions: 0,
      renewals: 0,
      cancellations: 0,
      expirations: 0,
      refunds: 0,
    });
  });
});
