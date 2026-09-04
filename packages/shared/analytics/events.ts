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
  AI_STORY_LANDING_CTA_CLICKED: "AI Story Landing CTA Clicked",
  AI_STORY_LANDING_VIEWED: "AI Story Landing Viewed",
  AI_STORY_LEAD_CAPTURED: "AI Story Lead Captured",
  APP_REVIEW: "App Review",
  APP_REVIEW_REQUEST: "App Review Request",
  APP_REVIEW_SKIPPED: "App Review Skipped",
  CHAT_OPENED: "Chat Opened",
  COMPLETE_DOG_PROFILE: "Complete Dog Profile",
  CREATE_DOG_PROFILE: "Create Dog Profile",
  DECK_SERVED: "Deck Served",
  DEEP_LINK_OPENED: "Deep Link Opened",
  DELETE_ACCOUNT_CANCELED: "Delete Account Canceled",
  DELETE_ACCOUNT_CONFIRMED: "Delete Account Confirmed",
  DELETE_ACCOUNT_PRESSED: "Delete Account Pressed",
  DOG_LINK_OPENED: "Dog Link Opened",
  DOG_LINK_PROFILE_OPENED: "Dog Link Profile Opened",
  DOG_LINK_SIGN_IN_BANNER_SHOWN: "Dog Link Sign In Banner Shown",
  EMPTY_DECK_ACTION_TAPPED: "Empty Deck Action Tapped",
  EMPTY_DECK_SHOWN: "Empty Deck Shown",
  FAKE_DOOR_NOTIFY_TOGGLED: "Fake Door Notify Toggled",
  FAKE_DOOR_SHOWN: "Fake Door Shown",
  FAKE_DOOR_TAPPED: "Fake Door Tapped",
  FEEDBACK: "Feedback",
  IMAGE_MODERATION_RESULT: "Image Moderation Result",
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
  REENGAGEMENT_PUSH_SENT: "Reengagement Push Sent",
  REENGAGEMENT_PUSH_SUPPRESSED: "Reengagement Push Suppressed",
  PUSH_PERMISSION: "Push Permission",
  PUSH_RECEIPT_RESULT: "Push Receipt Result",
  PUSH_TICKET_RESULT: "Push Ticket Result",
  REFERRAL_CAPTURED: "Referral Captured",
  RESTORE_PURCHASES: "RestorePurchases",
  RESTORE_PURCHASES_SUCCESS: "Restore Purchases Success",
  SAVE_PREFERENCES_PRESSED: "Save Preferences Pressed",
  SAVE_PROFILE_PRESSED: "Save Profile Pressed",
  SHARE_COMPLETED: "Share Completed",
  SHARE_PROMPT_SHOWN: "Share Prompt Shown",
  SHARE_PROMPT_TAPPED: "Share Prompt Tapped",
  SHARE_TAPPED: "Share Tapped",
  SIGN_IN_EMAIL_SUBMITTED: "Sign In Email Submitted",
  SIGNUP_ATTRIBUTED: "Signup Attributed",
  SKIP_COMPLETE_DOG_PROFILE: "Skip Complete Dog Profile",
  STORE_REDIRECT: "Store Redirect",
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
 * What the user picked on the empty swipe deck.
 *
 * One value, and it stays a union so a second action can be added without
 * the property changing shape in the warehouse. The screen's other control
 * is the share ask, and that reports through `Share Prompt Tapped` with the
 * `empty_deck` placement so it joins the rest of the share funnel rather
 * than forking a second one.
 */
export type EmptyDeckAction = "preferences";

/**
 * Which scheduled nudge the re-engagement cron sent.
 *
 * Restated here rather than imported from `REENGAGEMENT_KINDS` in the API for
 * the same reason the RevenueCat unions below are: `@pegada/shared` is a
 * dependency of `@pegada/api`, so the import would be a cycle. The API's own
 * constant is checked against this union where it is declared.
 */
export type ReengagementPushKind =
  | "likes_waiting"
  | "new_dogs_nearby"
  | "unanswered_match";

/**
 * Why a re-engagement push that had something to say was not sent.
 *
 * Restated here rather than imported for the same reason the kinds above are.
 * `window` is the only one that is not a cadence decision: the candidate was
 * due but the run caught the user outside their evening slot.
 */
export type ReengagementSuppressionReason =
  | "cooldown"
  | "dead_token"
  | "gave_up"
  | "monthly_cap"
  | "window";

/**
 * What a push was for, across every path that sends one: the three scheduled
 * nudges plus the transactional ones. One vocabulary so the delivery events
 * below break down by the same property whoever sent the push.
 */
export type PushKind =
  | ReengagementPushKind
  | "like"
  | "match"
  | "message"
  | "photo_rejected";

/**
 * Expo's answer about one push, at whichever of the two checkpoints asked.
 *
 * A ticket is Expo accepting the message; a receipt, fetched about half an
 * hour later, is Apple or Google saying what became of it. Only the second one
 * means delivered, which is why both are recorded separately rather than
 * collapsed into a single "sent".
 */
export type PushDeliveryStatus = "error" | "ok";

/**
 * The moment that produced a review prompt. The whole point of the review
 * instrumentation: ratings per prompt only means something per trigger.
 */
export type ReviewTrigger = "first_match" | "messages_tab" | "second_message";

/**
 * Where a store rating sheet was reached from: the three prompts, plus the
 * row in Settings that has always let people rate the app on purpose.
 */
export type ReviewSource = ReviewTrigger | "settings";

/**
 * Why a review prompt did not happen. Only the reasons a user who reached the
 * trigger can hit are ever sent: a plain "not yet" is not a skip.
 */
export type ReviewSkipReason =
  | "already_reviewed"
  | "first_prompt_already_shown"
  | "no_matches"
  | "not_enough_messages"
  | "not_first_match"
  | "store_review_unavailable"
  | "throttled";

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
 * Where `/store` sent a visitor, picked from the user agent. Mirrors
 * `StoreTarget` in `apps/nextjs/src/app/store/store-urls.ts`, restated here for
 * the same reason the RevenueCat unions below are: `@pegada/shared` is a
 * dependency of the site, not the other way round.
 *
 * `web` is a desktop browser, which has no install to be sent to and lands on
 * the landing page instead. Splitting the redirect by it is what separates a
 * link that reached a phone from one that reached a laptop, and only the first
 * kind can become an install.
 */
export type StoreRedirectTarget = "android" | "ios" | "web";

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
 * How far image moderation is turned up, mirroring `IMAGE_MODERATION_MODE` in
 * `packages/api/src/shared/config.ts`. Restated here rather than imported for
 * the same reason the RevenueCat unions further down are: `@pegada/shared` is a
 * dependency of `@pegada/api`, so importing back the other way would be a cycle.
 */
export type ImageModerationMode = "enforce" | "off" | "shadow";

/**
 * What the model said. `error` is a verdict rather than a missing event: the
 * photo is published either way, and an outage that is not counted is an outage
 * nobody notices.
 */
export type ImageModerationVerdict = "approve" | "error" | "reject";

/**
 * Event name to property shape, for events sent from the app.
 *
 * `analytics.track` is typed against this, so an unknown name or a property
 * that does not belong to the event is a compile error rather than a column
 * nobody notices is empty.
 */
export type MobileEventProperties = {
  [ANALYTICS_EVENTS.ADVERTISEMENT]: { action: string; type: string };
  [ANALYTICS_EVENTS.APP_REVIEW]: { trigger: ReviewSource };
  [ANALYTICS_EVENTS.APP_REVIEW_REQUEST]: { trigger: ReviewTrigger };
  [ANALYTICS_EVENTS.APP_REVIEW_SKIPPED]: {
    reason: ReviewSkipReason;
    trigger: ReviewTrigger;
  };
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
   * The three steps of the shared dog link funnel, in order: the link landed,
   * the sign in hand off was shown, the shared profile finally opened.
   * `authenticated` on the first step is what splits the people who have to
   * sign in from the ones who go straight through.
   */
  [ANALYTICS_EVENTS.DOG_LINK_OPENED]: { authenticated: boolean };
  [ANALYTICS_EVENTS.DOG_LINK_PROFILE_OPENED]: undefined;
  [ANALYTICS_EVENTS.DOG_LINK_SIGN_IN_BANNER_SHOWN]: undefined;
  /**
   * One per tap on an empty deck action. The share ask on that screen is not
   * one of them: it reports through `Share Prompt Tapped`, so counting it
   * here as well would double every share tap in the readout.
   */
  [ANALYTICS_EVENTS.EMPTY_DECK_ACTION_TAPPED]: { action: EmptyDeckAction };
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
  /**
   * `kind` is only set on the scheduled re-engagement pushes, and it is what
   * pairs an open with the "Reengagement Push Sent" that caused it, so the open
   * rate can be read per nudge. Reactive pushes carry the url alone.
   */
  [ANALYTICS_EVENTS.PUSH_NOTIFICATION_OPENED]: { kind?: string; url?: string };
  [ANALYTICS_EVENTS.PUSH_PERMISSION]: { status: PermissionStatus };
  // Keys stay camelCase here: they are the same names the referral link and
  // the server attribution already use, and matching them keeps a capture and
  // the signup it leads to joinable without a translation step.
  [ANALYTICS_EVENTS.REFERRAL_CAPTURED]: {
    cold: boolean;
    ref: string;
    referredByUserId: string | null;
    referredDogId: string | null;
  };
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
  /**
   * One row per page of the swipe deck the API hands back.
   *
   * The tier counts are the whole point: a deck of ten that is ten `primary`
   * dogs and a deck of ten that is two `primary` and eight refills look
   * identical from the app, and only the second one says the preferences are
   * starving the deck. `supply_*` is the same question asked of the city
   * instead of the filters, counted before any preference is applied, so an
   * empty deck in an empty town can be told apart from an empty deck behind a
   * tight filter.
   *
   * The supply counts are only taken when the page came back short, since the
   * scan behind them costs real time and a full page has already answered the
   * question. They are null on a full page and null when the person has no
   * location, so read them against `served < requested` rather than as a
   * series on their own.
   */
  [ANALYTICS_EVENTS.DECK_SERVED]: {
    beyond_radius_count: number;
    /** `served === 0`, kept as its own property so the rate is one breakdown. */
    empty: boolean;
    primary_count: number;
    /**
     * The radius that was actually applied, or null when nothing was narrowed:
     * no radius set, or a slider parked at the far end, which filters nothing.
     */
    radius_km: number | null;
    recycled_count: number;
    /** The page size the app asked for, which `served` is read against. */
    requested: number;
    same_gender_count: number;
    served: number;
    /** Null on a full page and when the person has no location. */
    supply_10km: number | null;
    supply_25km: number | null;
    supply_50km: number | null;
  };
  /**
   * One row per photo the moderation model looked at.
   *
   * `mode` is the property the whole rollout hangs on: the same verdict means
   * "would have rejected" in shadow and "did reject" in enforce, and without it
   * the two populations sit in one series and neither can be read. `verdict`
   * includes `error`, so a provider outage shows up as a shape change in the
   * distribution rather than as a gap.
   */
  [ANALYTICS_EVENTS.IMAGE_MODERATION_RESULT]: {
    /** Null when the model did not answer, which is every `error`. */
    contains_dog: boolean | null;
    cost_usd_estimate: number | null;
    dog_id: string | null;
    image_id: string;
    latency_ms: number;
    mode: ImageModerationMode;
    /** The `<provider>/<model-id>` the verdict came from. */
    model: string;
    /** Short category on a rejection, or the failure cause on an error. */
    reason: string | null;
    verdict: ImageModerationVerdict;
  };
  [ANALYTICS_EVENTS.MATCH_CREATED]: {
    match_id: string;
    other_user_id: string;
    seconds_since_signup: number;
  };
  [ANALYTICS_EVENTS.MESSAGE_SENT]: {
    match_id: string;
    message_type: "text";
  };
  /**
   * What the device said about a push, roughly half an hour after it left.
   *
   * This is the only event in the catalogue that means "delivered". Read as an
   * ok rate per `kind` it is the denominator every push funnel was missing:
   * before it existed, a push that Expo dropped and a push nobody opened were
   * the same data.
   */
  [ANALYTICS_EVENTS.PUSH_RECEIPT_RESULT]: {
    /** Expo's own code, such as `DeviceNotRegistered`. Null when ok. */
    error_code: string | null;
    /** Null only for a push enqueued before this property existed. */
    kind: PushKind | null;
    status: PushDeliveryStatus;
  };
  /**
   * What Expo said when the push was handed over. An error here is a push that
   * never reached a device at all, so it is the first place a silent failure
   * shows up.
   */
  [ANALYTICS_EVENTS.PUSH_TICKET_RESULT]: {
    error_code: string | null;
    kind: PushKind | null;
    status: PushDeliveryStatus;
  };
  /**
   * One row per re-engagement push handed to Expo. `dedupe_key` is the same key
   * the send claimed in `NotificationLog`, so a send and the open it produced
   * can be lined up without trusting timestamps.
   */
  [ANALYTICS_EVENTS.REENGAGEMENT_PUSH_SENT]: {
    dedupe_key: string;
    kind: ReengagementPushKind;
  };
  /**
   * One row per user the cron had a nudge for and deliberately did not send.
   *
   * The counterweight to the event above: sends alone cannot tell a quiet week
   * from a broken cron. `reason` is what makes the cadence auditable, and
   * `kind` is the nudge that was withheld, so the cost of the cadence can be
   * read per kind rather than only in aggregate.
   *
   * Emitted at most once per user per day rather than once per hourly run, so
   * the counts are people held back rather than passes over the same person.
   */
  [ANALYTICS_EVENTS.REENGAGEMENT_PUSH_SUPPRESSED]: {
    kind: ReengagementPushKind;
    reason: ReengagementSuppressionReason;
  };
  // Keys stay camelCase for the same reason "Referral Captured" keeps them:
  // the two events are joined on `ref` and `referredByUserId`, and a capture
  // that spells a key one way and the signup it produced another way is a
  // funnel nobody can build.
  [ANALYTICS_EVENTS.SIGNUP_ATTRIBUTED]: {
    platform: string;
    ref: string;
    referralSource: string | null;
    referredByUserId: string | null;
    referredDogId: string | null;
  };
  /**
   * One hit on `/store`, the printable link that forwards a visitor into the
   * App Store or Play Store with the campaign attached.
   *
   * Captured server side because the redirect is the entire response: there is
   * no page for a browser event to fire from. Every property except `store` is
   * read off the query string and is null when the link carried nothing, which
   * is most of them, so a breakdown by `ref` reads the channels that were
   * tagged rather than inventing a bucket for the ones that were not.
   *
   * `dogId` keeps its camelCase spelling. It is the key `/store` has always
   * sent and the same one "Referral Captured" and "Signup Attributed" use, and
   * a share link that spells it one way and the signup it produced another way
   * is a funnel nobody can join.
   */
  [ANALYTICS_EVENTS.STORE_REDIRECT]: {
    dogId: string | null;
    ref: string | null;
    store: StoreRedirectTarget;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_source: string | null;
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
 * How someone arrived, copied off the query string of the page they landed on.
 * Sent with every event of a campaign so a funnel can be read per channel, and
 * every key is optional because most visits carry none of them.
 */
export type LandingAttribution = {
  ref?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_source?: string;
};

/** Whether the address was new to the list or already on it. */
export type FeatureInterestStatus = "already_listed" | "captured";

/**
 * Event name to property shape, for events sent from the marketing site.
 *
 * The three below are one funnel: how many people saw the AI story page, how
 * many asked for it, how many left an address. `locale` sits on all three
 * because the page ships in two languages and they are not the same audience.
 */
export type WebEventProperties = {
  [ANALYTICS_EVENTS.AI_STORY_LANDING_CTA_CLICKED]: LandingAttribution & {
    locale: string;
  };
  [ANALYTICS_EVENTS.AI_STORY_LANDING_VIEWED]: LandingAttribution & {
    locale: string;
  };
  [ANALYTICS_EVENTS.AI_STORY_LEAD_CAPTURED]: LandingAttribution & {
    locale: string;
    status: FeatureInterestStatus;
  };
};

export type WebEventName = keyof WebEventProperties;

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
  ANALYTICS_EVENTS.APP_REVIEW_SKIPPED,
  ANALYTICS_EVENTS.CHAT_OPENED,
  ANALYTICS_EVENTS.COMPLETE_DOG_PROFILE,
  ANALYTICS_EVENTS.CREATE_DOG_PROFILE,
  ANALYTICS_EVENTS.DEEP_LINK_OPENED,
  ANALYTICS_EVENTS.DELETE_ACCOUNT_CANCELED,
  ANALYTICS_EVENTS.DELETE_ACCOUNT_CONFIRMED,
  ANALYTICS_EVENTS.DELETE_ACCOUNT_PRESSED,
  ANALYTICS_EVENTS.DOG_LINK_OPENED,
  ANALYTICS_EVENTS.DOG_LINK_PROFILE_OPENED,
  ANALYTICS_EVENTS.DOG_LINK_SIGN_IN_BANNER_SHOWN,
  ANALYTICS_EVENTS.EMPTY_DECK_ACTION_TAPPED,
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
  ANALYTICS_EVENTS.REFERRAL_CAPTURED,
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
  ANALYTICS_EVENTS.DECK_SERVED,
  ANALYTICS_EVENTS.IMAGE_MODERATION_RESULT,
  ANALYTICS_EVENTS.MATCH_CREATED,
  ANALYTICS_EVENTS.MESSAGE_SENT,
  ANALYTICS_EVENTS.PUSH_RECEIPT_RESULT,
  ANALYTICS_EVENTS.PUSH_TICKET_RESULT,
  ANALYTICS_EVENTS.REENGAGEMENT_PUSH_SENT,
  ANALYTICS_EVENTS.REENGAGEMENT_PUSH_SUPPRESSED,
  ANALYTICS_EVENTS.SIGNUP_ATTRIBUTED,
  ANALYTICS_EVENTS.STORE_REDIRECT,
  ANALYTICS_EVENTS.SUBSCRIPTION_EVENT,
] as const;

export const WEB_EVENT_NAMES = [
  ANALYTICS_EVENTS.AI_STORY_LANDING_CTA_CLICKED,
  ANALYTICS_EVENTS.AI_STORY_LANDING_VIEWED,
  ANALYTICS_EVENTS.AI_STORY_LEAD_CAPTURED,
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

const WEB_LIST_IS_COMPLETE: AssertCovers<
  WebEventName,
  (typeof WEB_EVENT_NAMES)[number]
> = true;

export const ANALYTICS_CATALOGUE_IS_COMPLETE =
  MOBILE_LIST_IS_COMPLETE && SERVER_LIST_IS_COMPLETE && WEB_LIST_IS_COMPLETE;
