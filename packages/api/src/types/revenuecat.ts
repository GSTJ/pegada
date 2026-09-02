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

export type BaseEvent = {
  type: EventType;
  id: string;
  app_id: string;
  event_timestamp_ms: number;
  store: StoreKind;
  environment: Environment;
  subscriber_attributes?: Record<string, unknown>;
  app_user_id?: string;
};

export type SubscriptionLifecycleEvent = {
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
  subscriber_attributes: Record<string, unknown>;
  transaction_id: string;
  original_transaction_id: string;
  is_family_share: boolean;
  country_code: string;
  offer_code: string | null;
} & BaseEvent;

export type EventTest = {
  type: "TEST";
} & BaseEvent;

export type EventInitialPurchase = {
  type: "INITIAL_PURCHASE";
} & SubscriptionLifecycleEvent;

export type EventRenewal = {
  type: "RENEWAL";
  is_trial_conversion: boolean;
  grace_period_expiration_at_ms: number;
} & SubscriptionLifecycleEvent;

export type EventCancellation = {
  type: "CANCELLATION";
  cancel_reason: CancellationExpirationReason;
} & SubscriptionLifecycleEvent;

export type EventUnancellation = {
  type: "UNCANCELLATION";
} & SubscriptionLifecycleEvent;

export type EventNonRenewingPurchase = {
  type: "NON_RENEWING_PURCHASE";
} & SubscriptionLifecycleEvent;

export type EventSubscriptionPaused = {
  type: "SUBSCRIPTION_PAUSED";
} & SubscriptionLifecycleEvent;

export type EventExpiration = {
  type: "EXPIRATION";
  expiration_reason: CancellationExpirationReason;
} & SubscriptionLifecycleEvent;

export type EventBillingIssue = {
  type: "BILLING_ISSUE";
  grace_period_expiration_at_ms: number;
} & SubscriptionLifecycleEvent;

export type EventProductChange = {
  type: "PRODUCT_CHANGE";
  new_product_id?: string | null;
} & SubscriptionLifecycleEvent;

export type EventTransfer = {
  type: "TRANSFER";
  transferred_from: string[];
  transferred_to: string[];
} & BaseEvent;

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

export type WebhookPayload = {
  api_version: string;
  event: Event;
};

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

export type BaseObject = {
  object: ObjectType;
};

export type ObjectList<T> = {
  object: "list";
  items: T[];
  next_page?: string | null;
  url: string;
} & BaseObject;

export type Project = {
  object: "project";
  id: string;
  name: string;
  created_at: number;
} & BaseObject;

export type App = {
  object: "app";
  id: string;
  name: string;
  created_at: number;
  project_id: string;
  type: AppType;
} & BaseObject;

export type Product = {
  object: "product";
  id: string;
  store_identifier: string;
  created_at: number;
  type: ProductType;
  app_id: string;
  app?: App;
  display_name: string;
} & BaseObject;

export type OneTimeProduct = {
  type: "one_time";
} & Product;

export type SubscriptionProduct = {
  type: "subscription";
  subscription: {
    duration: string | null;
    grace_period_duration: string | null;
    trial_duration: string | null;
  };
} & Product;

export type Entitlement = {
  object: "entitlement";
  project_id: string;
  id: string;
  lookup_key: string;
  display_name: string;
  created_at: number;
  products: ObjectList<Product>;
} & BaseObject;

export type PackageProduct = {
  eligibility_criteria: string;
  product: OneTimeProduct | SubscriptionProduct;
};

export type Package = {
  object: "package";
  id: string;
  lookup_key: string;
  display_name: string;
  position: number | null;
  created_at: number;
  products: ObjectList<PackageProduct>;
} & BaseObject;

export type Offering = {
  object: "offering";
  id: string;
  lookup_key: string;
  display_name: string;
  created_at: number;
  project_id: string;
  is_current: boolean;
  packages: ObjectList<Package>;
  metadata?: Record<string, unknown> | null;
} & BaseObject;
