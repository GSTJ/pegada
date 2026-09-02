/**
 * The single list of product analytics event names, shared by the app and the
 * API so a name can only ever be written once.
 *
 * Every name already in PostHog is kept exactly as it was first sent, typos
 * included ("User Typed Invalid OTP code", "RestorePurchases"). Renaming one
 * would split its history into two series, and the funnels built on top of the
 * old name would silently go flat. New names follow the house style the
 * majority of the existing ones use: Title Case, spaces, no prefix.
 *
 * Property keys follow the most recent convention in the codebase
 * (`has_birth_date`, `has_breed`): snake_case. The handful of camelCase keys on
 * "Like Limit Reached" are left alone for the same reason as the names.
 */

export const ANALYTICS_EVENTS = {
  ADVERTISEMENT: "Advertisement",
  APP_REVIEW: "App Review",
  APP_REVIEW_REQUEST: "App Review Request",
  CHAT_OPENED: "Chat Opened",
  COMPLETE_DOG_PROFILE: "Complete Dog Profile",
  CREATE_DOG_PROFILE: "Create Dog Profile",
  DEEP_LINK_OPENED: "Deep Link Opened",
  DELETE_ACCOUNT_CANCELED: "Delete Account Canceled",
  DELETE_ACCOUNT_CONFIRMED: "Delete Account Confirmed",
  DELETE_ACCOUNT_PRESSED: "Delete Account Pressed",
  EMPTY_DECK_ACTION_TAPPED: "Empty Deck Action Tapped",
  EMPTY_DECK_SHOWN: "Empty Deck Shown",
  FEEDBACK: "Feedback",
  INVALID_OTP_TYPED: "User Typed Invalid OTP code",
  LIKE_LIMIT_REACHED: "Like Limit Reached",
  LOCATION_PERMISSION: "Location Permission",
  LOGOUT_CANCELED: "Logout Canceled",
  LOGOUT_CONFIRMED: "Logout Confirmed",
  LOGOUT_PRESSED: "Logout Pressed",
  MANUAL_FEEDBACK: "Manual Feedback",
  MATCH_CREATED: "Match Created",
  MESSAGE_SENT: "Message Sent",
  NEW_MATCH: "New Match",
  OPEN_PRIVACY_POLICY: "Open Privacy Policy",
  OPEN_TERMS_OF_USE: "Open Terms Of Use",
  OTP_REQUESTED: "OTP Requested",
  OTP_VERIFIED: "OTP Verified",
  PAYWALL_VIEWED: "Paywall Viewed",
  PROFILE_PHOTO_ADDED: "Profile Photo Added",
  PUSH_NOTIFICATION_OPENED: "Push Notification Opened",
  PUSH_PERMISSION: "Push Permission",
  RESTORE_PURCHASES: "RestorePurchases",
  RESTORE_PURCHASES_SUCCESS: "Restore Purchases Success",
  SAVE_PREFERENCES_PRESSED: "Save Preferences Pressed",
  SAVE_PROFILE_PRESSED: "Save Profile Pressed",
  SHARE_COMPLETED: "Share Completed",
  SHARE_TAPPED: "Share Tapped",
  SIGN_IN_EMAIL_SUBMITTED: "Sign In Email Submitted",
  SKIP_COMPLETE_DOG_PROFILE: "Skip Complete Dog Profile",
  SUBSCRIPTION_EVENT: "Subscription Event",
  SWIPE: "Swipe",
  SWIPE_BACK: "Swipe Back",
  UPGRADE: "Upgrade",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Where a swipe came from, so gesture and button rates can be compared. */
export type SwipeSource = "button" | "gesture";

/** The three swipe outcomes, in the app's own words rather than the enum's. */
export type SwipeKind = "like" | "maybe" | "pass";

/** Why the paywall was shown. The whole point of the paywall instrumentation. */
export type PaywallTrigger =
  | "like_limit"
  | "other"
  | "profile_plan"
  | "swipe_back";

/** An OS permission answer, collapsed to the two states that matter. */
export type PermissionStatus = "denied" | "granted";

/** The two things the empty swipe deck offers besides the preferences link. */
export type EmptyDeckAction = "invite_friend" | "notify_new_dogs";

/**
 * The push answer as the empty deck sees it. Wider than
 * {@link PermissionStatus} because the button also runs where the OS never
 * asks at all, and reading that silence as a refusal would put every simulator
 * session in the denied bucket.
 */
export type PushPermissionOutcome = "denied" | "granted" | "unavailable";

/**
 * What came back from the share sheet. "unavailable" is the sheet that never
 * opened, which is a different thing from someone opening the invite and
 * changing their mind.
 */
export type ShareOutcome = "dismissed" | "shared" | "unavailable";

/**
 * Event name to property shape, for events sent from the app.
 *
 * `analytics.track` is typed against this, so an unknown name or a property
 * that does not belong to the event is a compile error rather than a column
 * nobody notices is empty.
 */
export type MobileEventProperties = {
  [ANALYTICS_EVENTS.ADVERTISEMENT]: { action: string; type: string };
  [ANALYTICS_EVENTS.APP_REVIEW]: undefined;
  [ANALYTICS_EVENTS.APP_REVIEW_REQUEST]: undefined;
  [ANALYTICS_EVENTS.CHAT_OPENED]: { match_id: string };
  [ANALYTICS_EVENTS.COMPLETE_DOG_PROFILE]: {
    has_birth_date: boolean;
    has_breed: boolean;
    has_color: boolean;
    has_size: boolean;
  };
  [ANALYTICS_EVENTS.CREATE_DOG_PROFILE]: { gender?: string; name?: string };
  [ANALYTICS_EVENTS.DEEP_LINK_OPENED]: { path?: string; url?: string };
  [ANALYTICS_EVENTS.DELETE_ACCOUNT_CANCELED]: undefined;
  [ANALYTICS_EVENTS.DELETE_ACCOUNT_CONFIRMED]: undefined;
  [ANALYTICS_EVENTS.DELETE_ACCOUNT_PRESSED]: undefined;
  /**
   * One per tap on an empty deck action. `push_permission` rides on the notify
   * action and `share_result` on the invite, so the funnel reads both the
   * intent and what the phone did about it.
   */
  [ANALYTICS_EVENTS.EMPTY_DECK_ACTION_TAPPED]: {
    action: EmptyDeckAction;
    push_permission?: PushPermissionOutcome;
    share_result?: ShareOutcome;
  };
  [ANALYTICS_EVENTS.EMPTY_DECK_SHOWN]: undefined;
  [ANALYTICS_EVENTS.FEEDBACK]: { feedback: string };
  [ANALYTICS_EVENTS.INVALID_OTP_TYPED]: undefined;
  [ANALYTICS_EVENTS.LIKE_LIMIT_REACHED]: {
    likeLimit: number;
    likeLimitResetAt?: Date | string | null;
  };
  [ANALYTICS_EVENTS.LOCATION_PERMISSION]: { status: PermissionStatus };
  [ANALYTICS_EVENTS.LOGOUT_CANCELED]: undefined;
  [ANALYTICS_EVENTS.LOGOUT_CONFIRMED]: undefined;
  [ANALYTICS_EVENTS.LOGOUT_PRESSED]: undefined;
  [ANALYTICS_EVENTS.MANUAL_FEEDBACK]: { feedback: string };
  [ANALYTICS_EVENTS.MESSAGE_SENT]: {
    has_text: boolean;
    match_id: string;
  };
  [ANALYTICS_EVENTS.NEW_MATCH]: { action: string };
  [ANALYTICS_EVENTS.OPEN_PRIVACY_POLICY]: undefined;
  [ANALYTICS_EVENTS.OPEN_TERMS_OF_USE]: undefined;
  [ANALYTICS_EVENTS.OTP_REQUESTED]: { resend: boolean };
  [ANALYTICS_EVENTS.OTP_VERIFIED]: { success: boolean };
  [ANALYTICS_EVENTS.PAYWALL_VIEWED]: { trigger: PaywallTrigger };
  [ANALYTICS_EVENTS.PROFILE_PHOTO_ADDED]: { position: number };
  [ANALYTICS_EVENTS.PUSH_NOTIFICATION_OPENED]: { url?: string };
  [ANALYTICS_EVENTS.PUSH_PERMISSION]: { status: PermissionStatus };
  [ANALYTICS_EVENTS.RESTORE_PURCHASES]: undefined;
  [ANALYTICS_EVENTS.RESTORE_PURCHASES_SUCCESS]: undefined;
  [ANALYTICS_EVENTS.SAVE_PREFERENCES_PRESSED]: {
    changes: Record<string, { from: unknown; to: unknown }>;
  };
  [ANALYTICS_EVENTS.SAVE_PROFILE_PRESSED]: undefined;
  [ANALYTICS_EVENTS.SHARE_COMPLETED]: {
    dog_id: string;
    is_own_dog: boolean;
    result: "dismissed" | "shared";
  };
  [ANALYTICS_EVENTS.SHARE_TAPPED]: { dog_id: string; is_own_dog: boolean };
  [ANALYTICS_EVENTS.SIGN_IN_EMAIL_SUBMITTED]: undefined;
  [ANALYTICS_EVENTS.SKIP_COMPLETE_DOG_PROFILE]: undefined;
  [ANALYTICS_EVENTS.SWIPE]: {
    dog_id: string;
    source: SwipeSource;
    swipe_type: SwipeKind;
  };
  [ANALYTICS_EVENTS.SWIPE_BACK]: undefined;
  [ANALYTICS_EVENTS.UPGRADE]: {
    package?: string;
    trial?: boolean | null;
    type: "cancel" | "error" | "start" | "success";
  };
};

export type MobileEventName = keyof MobileEventProperties;

/**
 * The RevenueCat vocabulary, restated.
 *
 * Deliberately a copy of the unions in `packages/api/src/types/revenuecat.ts`
 * rather than an import: `@pegada/shared` is a dependency of `@pegada/api`, so
 * importing back the other way would be a cycle. `packages/api` asserts the two
 * still agree at compile time (see `assertCatalogueMatchesRevenueCat` in
 * `payment-service.ts`), which is what stops this copy going stale quietly.
 */
export type SubscriptionEventType =
  | "BILLING_ISSUE"
  | "CANCELLATION"
  | "EXPIRATION"
  | "INITIAL_PURCHASE"
  | "NON_RENEWING_PURCHASE"
  | "PRODUCT_CHANGE"
  | "RENEWAL"
  | "SUBSCRIBER_ALIAS"
  | "SUBSCRIPTION_PAUSED"
  | "TEST"
  | "TRANSFER"
  | "UNCANCELLATION";

export type SubscriptionPeriodType =
  | "INTRO"
  | "NORMAL"
  | "PREPAID"
  | "PROMOTIONAL"
  | "TRIAL";

export type SubscriptionStore =
  | "AMAZON"
  | "APP_STORE"
  | "MAC_APP_STORE"
  | "PLAY_STORE"
  | "PROMOTIONAL"
  | "STRIPE";

export type SubscriptionEnvironment = "PRODUCTION" | "SANDBOX";

export type SubscriptionCancelReason =
  | "BILLING_ERROR"
  | "CUSTOMER_SUPPORT"
  | "DEVELOPER_INITIATED"
  | "PRICE_INCREASE"
  | "SUBSCRIPTION_PAUSED"
  | "UNKNOWN"
  | "UNSUBSCRIBE";

/**
 * Event name to property shape, for events captured by the API.
 *
 * "Message Sent" is deliberately the same name the app sends: the app's copy is
 * the one that survives an offline queue, the server's copy is the one that
 * cannot be dropped by an ad blocker or a killed process, and they are told
 * apart by the properties each carries.
 */
export type ServerEventProperties = {
  [ANALYTICS_EVENTS.MATCH_CREATED]: {
    match_id: string;
    other_user_id: string;
    seconds_since_signup: number;
  };
  [ANALYTICS_EVENTS.MESSAGE_SENT]: {
    match_id: string;
    message_type: "text";
  };
  [ANALYTICS_EVENTS.SUBSCRIPTION_EVENT]: {
    cancel_reason?: SubscriptionCancelReason | null;
    currency?: string | null;
    environment: SubscriptionEnvironment;
    expiration?: string | null;
    period_type?: SubscriptionPeriodType | null;
    price_in_purchased_currency?: number | null;
    price_usd?: number | null;
    product_id?: string | null;
    store: SubscriptionStore;
    type: SubscriptionEventType;
  };
};

export type ServerEventName = keyof ServerEventProperties;

/**
 * Person properties set on identify.
 *
 * Kept small on purpose: every one of these is a breakdown someone actually
 * asks for (does a paying user swipe more, do users without a photo ever
 * match), and PostHog charges for the rest.
 */
export type AnalyticsPersonProperties = {
  app_version?: string;
  city?: string | null;
  dogs_count?: number;
  /**
   * Nested keys the shared client flattens to `extra.*` on the way in. Holds
   * `user_plan`, the pre-catalogue name for `plan`, which is still written
   * alongside it so the insights already filtering on it keep working.
   */
  extra?: Record<string, unknown>;
  has_photos?: boolean;
  os_name?: string;
  plan?: string | null;
  platform?: string;
  primary_breed?: string | null;
  push_permission_status?: string;
};

/**
 * Runtime lists, for the test that proves the two property maps and
 * {@link ANALYTICS_EVENTS} never drift apart. The `Assert*` aliases below make
 * a forgotten entry a typecheck failure too, so the test is a second net rather
 * than the only one.
 */
export const MOBILE_EVENT_NAMES = [
  ANALYTICS_EVENTS.ADVERTISEMENT,
  ANALYTICS_EVENTS.APP_REVIEW,
  ANALYTICS_EVENTS.APP_REVIEW_REQUEST,
  ANALYTICS_EVENTS.CHAT_OPENED,
  ANALYTICS_EVENTS.COMPLETE_DOG_PROFILE,
  ANALYTICS_EVENTS.CREATE_DOG_PROFILE,
  ANALYTICS_EVENTS.DEEP_LINK_OPENED,
  ANALYTICS_EVENTS.DELETE_ACCOUNT_CANCELED,
  ANALYTICS_EVENTS.DELETE_ACCOUNT_CONFIRMED,
  ANALYTICS_EVENTS.DELETE_ACCOUNT_PRESSED,
  ANALYTICS_EVENTS.EMPTY_DECK_ACTION_TAPPED,
  ANALYTICS_EVENTS.EMPTY_DECK_SHOWN,
  ANALYTICS_EVENTS.FEEDBACK,
  ANALYTICS_EVENTS.INVALID_OTP_TYPED,
  ANALYTICS_EVENTS.LIKE_LIMIT_REACHED,
  ANALYTICS_EVENTS.LOCATION_PERMISSION,
  ANALYTICS_EVENTS.LOGOUT_CANCELED,
  ANALYTICS_EVENTS.LOGOUT_CONFIRMED,
  ANALYTICS_EVENTS.LOGOUT_PRESSED,
  ANALYTICS_EVENTS.MANUAL_FEEDBACK,
  ANALYTICS_EVENTS.MESSAGE_SENT,
  ANALYTICS_EVENTS.NEW_MATCH,
  ANALYTICS_EVENTS.OPEN_PRIVACY_POLICY,
  ANALYTICS_EVENTS.OPEN_TERMS_OF_USE,
  ANALYTICS_EVENTS.OTP_REQUESTED,
  ANALYTICS_EVENTS.OTP_VERIFIED,
  ANALYTICS_EVENTS.PAYWALL_VIEWED,
  ANALYTICS_EVENTS.PROFILE_PHOTO_ADDED,
  ANALYTICS_EVENTS.PUSH_NOTIFICATION_OPENED,
  ANALYTICS_EVENTS.PUSH_PERMISSION,
  ANALYTICS_EVENTS.RESTORE_PURCHASES,
  ANALYTICS_EVENTS.RESTORE_PURCHASES_SUCCESS,
  ANALYTICS_EVENTS.SAVE_PREFERENCES_PRESSED,
  ANALYTICS_EVENTS.SAVE_PROFILE_PRESSED,
  ANALYTICS_EVENTS.SHARE_COMPLETED,
  ANALYTICS_EVENTS.SHARE_TAPPED,
  ANALYTICS_EVENTS.SIGN_IN_EMAIL_SUBMITTED,
  ANALYTICS_EVENTS.SKIP_COMPLETE_DOG_PROFILE,
  ANALYTICS_EVENTS.SWIPE,
  ANALYTICS_EVENTS.SWIPE_BACK,
  ANALYTICS_EVENTS.UPGRADE,
] as const;

export const SERVER_EVENT_NAMES = [
  ANALYTICS_EVENTS.MATCH_CREATED,
  ANALYTICS_EVENTS.MESSAGE_SENT,
  ANALYTICS_EVENTS.SUBSCRIPTION_EVENT,
] as const;

type AssertCovers<Name extends string, Listed extends string> = [
  Exclude<Name, Listed>,
] extends [never]
  ? true
  : never;

const MOBILE_LIST_IS_COMPLETE: AssertCovers<
  MobileEventName,
  (typeof MOBILE_EVENT_NAMES)[number]
> = true;

const SERVER_LIST_IS_COMPLETE: AssertCovers<
  ServerEventName,
  (typeof SERVER_EVENT_NAMES)[number]
> = true;

export const ANALYTICS_CATALOGUE_IS_COMPLETE =
  MOBILE_LIST_IS_COMPLETE && SERVER_LIST_IS_COMPLETE;
