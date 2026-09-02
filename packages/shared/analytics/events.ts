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
  EMPTY_DECK_SHOWN: "Empty Deck Shown",
  FAKE_DOOR_NOTIFY_TOGGLED: "Fake Door Notify Toggled",
  FAKE_DOOR_SHOWN: "Fake Door Shown",
  FAKE_DOOR_TAPPED: "Fake Door Tapped",
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
  SHARE_PROMPT_SHOWN: "Share Prompt Shown",
  SHARE_PROMPT_TAPPED: "Share Prompt Tapped",
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

/** Which row of the dog share sheet the user picked. */
export type ShareOption = "copy_link" | "link" | "story";

/**
 * Where the share prompt card was rendered: an empty deck (nobody left to
 * swipe) or the first match. Doubles as the share sheet's `source`, so the
 * prompt funnel and the share funnel join on one property instead of two
 * vocabularies that have to be mapped onto each other in the readout.
 */
export type SharePromptPlacement = "empty_deck" | "first_match";

/**
 * Which entry point opened the dog share sheet.
 *
 * Kept alongside `is_own_dog` rather than folded into it: the two placements
 * above share the user's own dog too, so `is_own_dog` on its own can no longer
 * tell a prompted share from the profile button.
 */
export type ShareSource = SharePromptPlacement | "dog_profile" | "own_profile";

/**
 * A feature the app advertises before it exists, so demand can be measured
 * before anything big gets built. Mirrors the zod enum in
 * `packages/api/src/routes/feature-interest.ts`, which rejects any id it does
 * not know.
 */
export type FakeDoorFeature = "ai_story_video" | "referral_reward";

/**
 * Which surface the fake door row was rendered on. Only the share sheet
 * carries them today, and the property is still sent so a second surface can
 * be added without splitting the funnel across event names.
 */
export type FakeDoorSource = "share_sheet";

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
  [ANALYTICS_EVENTS.EMPTY_DECK_SHOWN]: undefined;
  [ANALYTICS_EVENTS.FAKE_DOOR_NOTIFY_TOGGLED]: {
    feature: FakeDoorFeature;
    /**
     * False when the user changed their mind, so the waiting list can be
     * netted off without stitching a second event name into the readout.
     */
    interested: boolean;
  };
  [ANALYTICS_EVENTS.FAKE_DOOR_SHOWN]: {
    feature: FakeDoorFeature;
    source: FakeDoorSource;
  };
  [ANALYTICS_EVENTS.FAKE_DOOR_TAPPED]: {
    feature: FakeDoorFeature;
    source: FakeDoorSource;
  };
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
    /**
     * True when the story row could not produce an image and shared the plain
     * link instead, so a degraded share does not read as a story share.
     */
    fallback: boolean;
    is_own_dog: boolean;
    /** `null` when the sheet was closed without a row being picked. */
    option: ShareOption | null;
    result: "dismissed" | "error" | "shared";
    source: ShareSource;
  };
  [ANALYTICS_EVENTS.SHARE_PROMPT_SHOWN]: {
    dog_id: string;
    placement: SharePromptPlacement;
  };
  [ANALYTICS_EVENTS.SHARE_PROMPT_TAPPED]: {
    dog_id: string;
    placement: SharePromptPlacement;
  };
  [ANALYTICS_EVENTS.SHARE_TAPPED]: {
    dog_id: string;
    is_own_dog: boolean;
    source: ShareSource;
  };
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
  ANALYTICS_EVENTS.EMPTY_DECK_SHOWN,
  ANALYTICS_EVENTS.FAKE_DOOR_NOTIFY_TOGGLED,
  ANALYTICS_EVENTS.FAKE_DOOR_SHOWN,
  ANALYTICS_EVENTS.FAKE_DOOR_TAPPED,
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
  ANALYTICS_EVENTS.SHARE_PROMPT_SHOWN,
  ANALYTICS_EVENTS.SHARE_PROMPT_TAPPED,
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
