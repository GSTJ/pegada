import type {
  Environment,
  Event,
  EventBillingIssue,
  EventCancellation,
  EventExpiration,
  EventInitialPurchase,
  EventNonRenewingPurchase,
  EventProductChange,
  EventRenewal,
  EventSubscriptionPaused,
  EventTest,
  EventTransfer,
  EventUnancellation,
  PeriodType,
  StoreKind,
  WebhookPayload,
} from "../../types/revenuecat";

/**
 * Webhook payloads shaped after RevenueCat's documented event fields, so the
 * subscription log is tested against what the store actually posts rather than
 * against our own types.
 * https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */

export const PRODUCT_ID = "pegada_premium_monthly";
export const PURCHASED_AT_MS = 1_772_000_000_000;
export const EXPIRATION_AT_MS = 1_774_592_000_000;

const base = {
  app_id: "appc1a2b3c4d5",
  event_timestamp_ms: PURCHASED_AT_MS,
  store: "APP_STORE" as StoreKind,
  environment: "PRODUCTION" as Environment,
};

const subscription = (appUserId: string) => {
  return {
    ...base,
    app_user_id: appUserId,
    original_app_user_id: appUserId,
    aliases: [appUserId],
    product_id: PRODUCT_ID,
    entitlement_ids: ["premium"],
    entitlement_id: "premium",
    period_type: "NORMAL" as PeriodType,
    presented_offering_id: "default",
    purchased_at_ms: PURCHASED_AT_MS,
    expiration_at_ms: EXPIRATION_AT_MS,
    price: 19.9,
    currency: "BRL",
    price_in_purchased_currency: 19.9,
    tax_percentage: 0,
    commission_percentage: 0.15,
    takehome_percentage: 0.85,
    subscriber_attributes: {},
    transaction_id: "2000000512345678",
    original_transaction_id: "2000000512345678",
    is_family_share: false,
    country_code: "BR",
    offer_code: null,
  };
};

export const initialPurchase = (
  id: string,
  appUserId: string,
  overrides: Partial<EventInitialPurchase> = {},
): EventInitialPurchase => ({
  ...subscription(appUserId),
  type: "INITIAL_PURCHASE",
  id,
  ...overrides,
});

export const trialStart = (
  id: string,
  appUserId: string,
): EventInitialPurchase =>
  initialPurchase(id, appUserId, { period_type: "TRIAL", price: 0 });

export const renewal = (
  id: string,
  appUserId: string,
  overrides: Partial<EventRenewal> = {},
): EventRenewal => ({
  ...subscription(appUserId),
  type: "RENEWAL",
  id,
  is_trial_conversion: false,
  grace_period_expiration_at_ms: EXPIRATION_AT_MS,
  ...overrides,
});

/** A trial that started paying, flagged by RevenueCat's own signal. */
export const trialConversion = (id: string, appUserId: string): EventRenewal =>
  renewal(id, appUserId, { is_trial_conversion: true });

export const cancellation = (
  id: string,
  appUserId: string,
  overrides: Partial<EventCancellation> = {},
): EventCancellation => ({
  ...subscription(appUserId),
  type: "CANCELLATION",
  id,
  cancel_reason: "UNSUBSCRIBE",
  ...overrides,
});

/** The one cancel reason RevenueCat documents as a refund. */
export const refund = (id: string, appUserId: string): EventCancellation =>
  cancellation(id, appUserId, { cancel_reason: "CUSTOMER_SUPPORT" });

export const uncancellation = (
  id: string,
  appUserId: string,
): EventUnancellation => ({
  ...subscription(appUserId),
  type: "UNCANCELLATION",
  id,
});

export const expiration = (id: string, appUserId: string): EventExpiration => ({
  ...subscription(appUserId),
  type: "EXPIRATION",
  id,
  expiration_reason: "UNSUBSCRIBE",
});

export const productChange = (
  id: string,
  appUserId: string,
): EventProductChange => ({
  ...subscription(appUserId),
  type: "PRODUCT_CHANGE",
  id,
  new_product_id: "pegada_premium_yearly",
});

export const billingIssue = (
  id: string,
  appUserId: string,
): EventBillingIssue => ({
  ...subscription(appUserId),
  type: "BILLING_ISSUE",
  id,
  grace_period_expiration_at_ms: EXPIRATION_AT_MS,
});

export const subscriptionPaused = (
  id: string,
  appUserId: string,
): EventSubscriptionPaused => ({
  ...subscription(appUserId),
  type: "SUBSCRIPTION_PAUSED",
  id,
});

export const nonRenewingPurchase = (
  id: string,
  appUserId: string,
): EventNonRenewingPurchase => ({
  ...subscription(appUserId),
  type: "NON_RENEWING_PURCHASE",
  id,
  expiration_at_ms: null,
});

export const transfer = (
  id: string,
  transferredFrom: string[],
  transferredTo: string[],
): EventTransfer => ({
  ...base,
  type: "TRANSFER",
  id,
  transferred_from: transferredFrom,
  transferred_to: transferredTo,
});

/** RevenueCat's dashboard "send test event" button, and no user attached. */
export const testEvent = (id: string): EventTest => ({
  ...base,
  type: "TEST",
  id,
});

export const webhookPayload = (event: Event): WebhookPayload => ({
  api_version: "1.0",
  event,
});
