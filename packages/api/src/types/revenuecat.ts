export type EventType =
  | "TEST"
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "SUBSCRIPTION_PAUSED"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "TRANSFER"
  | "SUBSCRIBER_ALIAS";

export type PeriodType =
  | "TRIAL"
  | "INTRO"
  | "NORMAL"
  | "PROMOTIONAL"
  | "PREPAID";

export type StoreKind =
  | "AMAZON"
  | "APP_STORE"
  | "MAC_APP_STORE"
  | "PLAY_STORE"
  | "PROMOTIONAL"
  | "STRIPE";

export type Environment = "SANDBOX" | "PRODUCTION";

export type CancellationExpirationReason =
  | "UNSUBSCRIBE"
  | "BILLING_ERROR"
  | "DEVELOPER_INITIATED"
  | "PRICE_INCREASE"
  | "CUSTOMER_SUPPORT"
  | "UNKNOWN"
  | "SUBSCRIPTION_PAUSED";

export interface BaseEvent {
  type: EventType;
  id: string;
  app_id: string;
  event_timestamp_ms: number;
  store: StoreKind;
  environment: Environment;
  subscriber_attributes?: any;
  app_user_id?: string;
}

export interface SubscriptionLifecycleEvent extends BaseEvent {
  app_user_id: string;
  original_app_user_id: string;
  aliases: string[];
  product_id: string;
  entitlement_ids: string[] | null;
  entitlement_id?: string | null;
  period_type: PeriodType;
  presented_offering_id?: string | null;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  price: number | null;
  currency: string | null;
  price_in_purchased_currency: number | null;
  tax_percentage: number | null;
  commission_percentage: number | null;
  takehome_percentage?: number | null;
  subscriber_attributes: any;
  transaction_id: string;
  original_transaction_id: string;
  is_family_share: boolean;
  country_code: string;
  offer_code: string | null;
}

export interface EventTest extends BaseEvent {
  type: "TEST";
}

export interface EventInitialPurchase extends SubscriptionLifecycleEvent {
  type: "INITIAL_PURCHASE";
}

export interface EventRenewal extends SubscriptionLifecycleEvent {
  type: "RENEWAL";
  is_trial_conversion: boolean;
  grace_period_expiration_at_ms: number;
}

export interface EventCancellation extends SubscriptionLifecycleEvent {
  type: "CANCELLATION";
  cancel_reason: CancellationExpirationReason;
}

export interface EventUnancellation extends SubscriptionLifecycleEvent {
  type: "UNCANCELLATION";
}

export interface EventNonRenewingPurchase extends SubscriptionLifecycleEvent {
  type: "NON_RENEWING_PURCHASE";
}

export interface EventSubscriptionPaused extends SubscriptionLifecycleEvent {
  type: "SUBSCRIPTION_PAUSED";
}

export interface EventExpiration extends SubscriptionLifecycleEvent {
  type: "EXPIRATION";
  expiration_reason: CancellationExpirationReason;
}

export interface EventBillingIssue extends SubscriptionLifecycleEvent {
  type: "BILLING_ISSUE";
  grace_period_expiration_at_ms: number;
}

export interface EventProductChange extends SubscriptionLifecycleEvent {
  type: "PRODUCT_CHANGE";
  new_product_id?: string | null;
}

export interface EventTransfer extends BaseEvent {
  type: "TRANSFER";
  transferred_from: string[];
  transferred_to: string[];
}

export type Event =
  | EventTest
  | EventInitialPurchase
  | EventRenewal
  | EventCancellation
  | EventUnancellation
  | EventNonRenewingPurchase
  | EventSubscriptionPaused
  | EventExpiration
  | EventBillingIssue
  | EventProductChange
  | EventTransfer;

export interface WebhookPayload {
  api_version: string;
  event: Event;
}

export type ObjectType =
  | "list"
  | "project"
  | "app"
  | "entitlement"
  | "product"
  | "package"
  | "offering";
export type AppType =
  | "amazon"
  | "app_store"
  | "mac_app_store"
  | "play_store"
  | "stripe";
export type ProductType = "subscription" | "one_time";

export interface BaseObject {
  object: ObjectType;
}

export interface ObjectList<T> extends BaseObject {
  object: "list";
  items: T[];
  next_page?: string | null;
  url: string;
}

export interface Project extends BaseObject {
  object: "project";
  id: string;
  name: string;
  created_at: number;
}

export interface App extends BaseObject {
  object: "app";
  id: string;
  name: string;
  created_at: number;
  project_id: string;
  type: AppType;
}

export interface Product extends BaseObject {
  object: "product";
  id: string;
  store_identifier: string;
  created_at: number;
  type: ProductType;
  app_id: string;
  app?: App;
  display_name: string;
}

export interface OneTimeProduct extends Product {
  type: "one_time";
}

export interface SubscriptionProduct extends Product {
  type: "subscription";
  subscription: {
    duration: string | null;
    grace_period_duration: string | null;
    trial_duration: string | null;
  };
}

export interface Entitlement extends BaseObject {
  object: "entitlement";
  project_id: string;
  id: string;
  lookup_key: string;
  display_name: string;
  created_at: number;
  products: ObjectList<Product>;
}

export interface PackageProduct {
  eligibility_criteria: string;
  product: OneTimeProduct | SubscriptionProduct;
}

export interface Package extends BaseObject {
  object: "package";
  id: string;
  lookup_key: string;
  display_name: string;
  position: number | null;
  created_at: number;
  products: ObjectList<PackageProduct>;
}

export interface Offering extends BaseObject {
  object: "offering";
  id: string;
  lookup_key: string;
  display_name: string;
  created_at: number;
  project_id: string;
  is_current: boolean;
  packages: ObjectList<Package>;
  metadata?: Record<string, any> | null;
}
