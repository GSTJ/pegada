const mockCaptureEvent = jest.fn();
const mockUpdateUserById = jest.fn();
const mockTransaction = jest.fn();

jest.mock("../shared/analytics", () => ({
  captureEvent: (...args: unknown[]) => mockCaptureEvent(...args),
}));

jest.mock("@pegada/database", () => ({
  __esModule: true,
  default: { $transaction: (...args: unknown[]) => mockTransaction(...args) },
}));

jest.mock("./user-service", () => ({
  UserService: {
    updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
  },
}));

import type {
  Event,
  EventCancellation,
  EventExpiration,
  EventTransfer,
  SubscriptionLifecycleEvent,
} from "../types/revenuecat";

import PaymentService from "./payment-service";

/**
 * The `type` values the handler can actually be called with.
 *
 * Narrower than the exported `EventType`, which also lists `SUBSCRIBER_ALIAS`
 * — a type the `Event` union has no member for, so no payload of that type can
 * be constructed. Derived from `Event` rather than written out so a new webhook
 * member is a compile error here rather than a silently untested branch.
 */
type HandledEventType = Event["type"];

const EVERY_EVENT_TYPE: HandledEventType[] = [
  "TEST",
  "INITIAL_PURCHASE",
  "RENEWAL",
  "CANCELLATION",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_PAUSED",
  "EXPIRATION",
  "BILLING_ISSUE",
  "PRODUCT_CHANGE",
  "TRANSFER",
];

/**
 * One payload shape holding every field any member of the union can carry.
 *
 * RevenueCat sends a single JSON body and the union splits it by `type`, so no
 * member allows both `product_id` and `transferred_to`. A fixture builder has
 * to sit above that split; keeping the fields typed means a renamed field on
 * the real types still breaks this file.
 */
type EventFixture = Omit<Partial<SubscriptionLifecycleEvent>, "type"> &
  Partial<Pick<EventCancellation, "cancel_reason">> &
  Partial<Pick<EventExpiration, "expiration_reason">> &
  Partial<Pick<EventTransfer, "transferred_from" | "transferred_to">> & {
    type: HandledEventType;
  };

const EXPIRES_AT_MS = Date.UTC(2026, 0, 1);
const EXPIRES_AT_ISO = new Date(EXPIRES_AT_MS).toISOString();

const buildEvent = (overrides: EventFixture) =>
  ({
    id: "event-1",
    app_id: "app-1",
    app_user_id: "user-1",
    event_timestamp_ms: 0,
    store: "APP_STORE",
    environment: "PRODUCTION",
    product_id: "premium_monthly",
    period_type: "TRIAL",
    price: 19.9,
    currency: "BRL",
    expiration_at_ms: EXPIRES_AT_MS,
    transferred_from: [],
    transferred_to: [],
    ...overrides,
  }) as unknown as Event;

const service = new PaymentService();

beforeEach(() => {
  mockTransaction.mockResolvedValue([]);
});

describe("PaymentService.handleRevenueCatEvent", () => {
  it("captures a Subscription Event for every type RevenueCat can send", () => {
    // Most of these change no plan at all, and those are exactly the ones that
    // answer "why did they leave" — so the capture sits before the switch.
    for (const type of EVERY_EVENT_TYPE) {
      void service.handleRevenueCatEvent({ event: buildEvent({ type }) });
    }

    expect(mockCaptureEvent).toHaveBeenCalledTimes(EVERY_EVENT_TYPE.length);

    const capturedTypes = mockCaptureEvent.mock.calls.map(
      (call) => call[2].type,
    );
    expect(capturedTypes).toEqual(EVERY_EVENT_TYPE);
  });

  it("sends the billing detail the revenue questions are asked in", () => {
    service.handleRevenueCatEvent({
      event: buildEvent({ type: "INITIAL_PURCHASE" }),
    });

    expect(mockCaptureEvent).toHaveBeenCalledWith(
      "user-1",
      "Subscription Event",
      expect.objectContaining({
        type: "INITIAL_PURCHASE",
        product_id: "premium_monthly",
        period_type: "TRIAL",
        price: 19.9,
        currency: "BRL",
        store: "APP_STORE",
        environment: "PRODUCTION",
        expiration: EXPIRES_AT_ISO,
      }),
    );
  });

  it("reads a cancellation's reason and an expiration's under one key", () => {
    service.handleRevenueCatEvent({
      event: buildEvent({
        type: "CANCELLATION",
        cancel_reason: "UNSUBSCRIBE",
      }),
    });
    service.handleRevenueCatEvent({
      event: buildEvent({
        type: "EXPIRATION",
        expiration_reason: "BILLING_ERROR",
      }),
    });

    const reasons = mockCaptureEvent.mock.calls.map(
      (call) => call[2].cancel_reason,
    );
    expect(reasons).toEqual(["UNSUBSCRIBE", "BILLING_ERROR"]);
  });

  it("leaves an event with no billing detail with nulls rather than undefined", () => {
    service.handleRevenueCatEvent({
      event: {
        type: "TEST",
        id: "event-1",
        app_id: "app-1",
        event_timestamp_ms: 0,
        store: "APP_STORE",
        environment: "SANDBOX",
      } as Event,
    });

    expect(mockCaptureEvent).toHaveBeenCalledWith(
      "",
      "Subscription Event",
      expect.objectContaining({
        type: "TEST",
        product_id: null,
        period_type: null,
        price: null,
        currency: null,
        expiration: null,
        cancel_reason: null,
      }),
    );
  });

  describe("plan mutations, which this change must not touch", () => {
    it("does not downgrade on CANCELLATION", () => {
      // A cancellation is a promise to leave at the end of the period. The
      // entitlement is still paid for until EXPIRATION says otherwise.
      service.handleRevenueCatEvent({
        event: buildEvent({ type: "CANCELLATION" }),
      });

      expect(mockUpdateUserById).not.toHaveBeenCalled();
    });

    it("downgrades on EXPIRATION", () => {
      service.handleRevenueCatEvent({
        event: buildEvent({ type: "EXPIRATION" }),
      });

      expect(mockUpdateUserById).toHaveBeenCalledWith("user-1", {
        plan: "FREE",
      });
    });

    it("upgrades on INITIAL_PURCHASE with the premium entitlement", () => {
      service.handleRevenueCatEvent({
        event: buildEvent({
          type: "INITIAL_PURCHASE",
          entitlement_ids: ["premium"],
        }),
      });

      expect(mockUpdateUserById).toHaveBeenCalledWith("user-1", {
        plan: "PREMIUM",
      });
    });

    it("ignores anonymous purchasers", () => {
      service.handleRevenueCatEvent({
        event: buildEvent({
          type: "INITIAL_PURCHASE",
          app_user_id: "$RCAnonymousID:abc",
        }),
      });

      expect(mockUpdateUserById).not.toHaveBeenCalled();
      // Still captured: an anonymous purchase is revenue that happened.
      expect(mockCaptureEvent).toHaveBeenCalledTimes(1);
    });
  });
});
