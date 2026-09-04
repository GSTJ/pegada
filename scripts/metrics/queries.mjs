/**
 * HogQL builders for the daily readout.
 *
 * Every function here is pure: it takes a window pair and returns a query
 * string. Nothing in this file talks to the network, which is what makes the
 * whole query surface testable without a PostHog key.
 *
 * Event names are copied from `packages/shared/analytics/events.ts`. They are
 * copied rather than imported because this script runs as plain Node from the
 * repository root, outside any workspace, so there is no build step that could
 * turn that TypeScript file into something importable. `events.test.mjs` reads
 * the catalogue as text and fails if a name here ever stops matching it.
 */

/** Names used by the readout, spelled exactly as PostHog stores them. */
export const EVENTS = {
  CREATE_DOG_PROFILE: "Create Dog Profile",
  EMPTY_DECK_SHOWN: "Empty Deck Shown",
  FAKE_DOOR_TAPPED: "Fake Door Tapped",
  IMAGE_MODERATION_RESULT: "Image Moderation Result",
  MESSAGE_SENT: "Message Sent",
  NEW_MATCH: "New Match",
  PAYWALL_VIEWED: "Paywall Viewed",
  PUSH_NOTIFICATION_OPENED: "Push Notification Opened",
  PUSH_TICKET_RESULT: "Push Ticket Result",
  REENGAGEMENT_PUSH_SENT: "Reengagement Push Sent",
  SHARE_COMPLETED: "Share Completed",
  SHARE_PROMPT_TAPPED: "Share Prompt Tapped",
  SHARE_TAPPED: "Share Tapped",
  SIGNUP_ATTRIBUTED: "Signup Attributed",
  SUBSCRIPTION_EVENT: "Subscription Event",
  SWIPE: "Swipe",
  UPGRADE: "Upgrade",
};

/** Every event the totals query counts, in one list so the IN clause is stable. */
export const COUNTED_EVENTS = Object.values(EVENTS).sort();

/**
 * The `$lib` values the PostHog SDKs report when a person is the one acting.
 *
 * `posthog-react-native` is the app, `web` is posthog-js on the marketing site.
 * The API uses posthog-node, which reports `posthog-node`, so an allow list
 * keeps a new server integration out of the activity number by default rather
 * than letting it in until somebody notices.
 */
export const CLIENT_LIBS = ["posthog-react-native", "web"];

/**
 * Events emitted from `packages/api`, listed so they can be excluded.
 *
 * They are captured against the user they are about, so a push the cron sent to
 * a person who never opened the app still carries that person's distinct id.
 * Counting them as activity is what turned 20 real users into 579. The `$lib`
 * allow list above already removes them; this list is the second guard, for the
 * day one of these is captured through a proxy that rewrites `$lib`.
 */
export const SERVER_EVENTS = [
  "Deck Served",
  "Image Moderation Result",
  "Match Created",
  "Message Sent",
  "Push Receipt Result",
  "Push Ticket Result",
  "Reengagement Push Sent",
  "Signup Attributed",
  "Subscription Event",
].sort();

/**
 * The build most people are actually running, and the readout events it has no
 * code to send.
 *
 * Checked against the live events audit on issue #188, not against the v1.6.2
 * tag. `runtimeVersion` follows `appVersion`, so a phone reporting
 * `$app_version` 1.6.2 runs whatever JavaScript was last published to the 1.6.2
 * runtime, which is the backport branch rather than the tag. Reading the tag is
 * what put `Swipe`, `Paywall Viewed` and `Empty Deck Shown` on this list while
 * PostHog was receiving all three from 1.6.2 phones, and a coverage note that
 * excuses a live row is worse than no note: it explains away the number someone
 * needed to act on.
 *
 * The list is only client events: the API emits `Message Sent`,
 * `Reengagement Push Sent`, `Push Ticket Result` and the rest of
 * `SERVER_EVENTS` from the deployed server, so those rows are real whatever
 * build a person is on.
 *
 * Keep this in step with what the audit sees from 1.6.2, not with what is on
 * main. The point of the note is to stop a reach gap from reading as a dead
 * product, and it only works while every name on it is a genuine gap.
 */
export const STORE_BUILD_COVERAGE = {
  missingEvents: [
    EVENTS.FAKE_DOOR_TAPPED,
    EVENTS.PUSH_NOTIFICATION_OPENED,
    EVENTS.SHARE_COMPLETED,
    EVENTS.SHARE_PROMPT_TAPPED,
    EVENTS.SHARE_TAPPED,
  ],
  version: "1.6.2",
};

/**
 * The property posthog-react-native puts on every event from the native app,
 * read out of the app bundle rather than sent by hand. Web events do not carry
 * it, so they land in the `unknown` bucket, which is the honest answer for a
 * browser.
 */
export const APP_VERSION_PROPERTY = "$app_version";

/**
 * The breakdowns, each one event split by one property.
 *
 * Three of them double as headline numbers: the successful upgrades, the story
 * shares and the push ok rate are all a single bucket of a breakdown, so asking
 * for them separately would be a second query returning a number the first one
 * already has.
 */
export const BREAKDOWNS = [
  {
    id: "upgrade_type",
    event: EVENTS.UPGRADE,
    property: "type",
    title: "Upgrade by type",
  },
  {
    id: "share_option",
    event: EVENTS.SHARE_COMPLETED,
    property: "option",
    title: "Share Completed by option",
  },
  {
    id: "push_ticket_status",
    event: EVENTS.PUSH_TICKET_RESULT,
    property: "status",
    title: "Push Ticket Result by status",
  },
  {
    id: "fake_door_feature",
    event: EVENTS.FAKE_DOOR_TAPPED,
    property: "feature",
    title: "Fake Door Tapped by feature",
  },
  {
    id: "signup_ref",
    event: EVENTS.SIGNUP_ATTRIBUTED,
    property: "ref",
    title: "Signup Attributed by ref",
  },
  {
    id: "moderation_verdict",
    event: EVENTS.IMAGE_MODERATION_RESULT,
    property: "verdict",
    title: "Image Moderation Result by verdict",
  },
  {
    id: "subscription_type",
    event: EVENTS.SUBSCRIPTION_EVENT,
    property: "type",
    title: "Subscription Event by type",
  },
  // The three below are the pricing readout. Together they answer which
  // trigger sends people to the paywall and how well each one converts, how
  // much of the revenue is a trial that has not become paid yet, and whether a
  // subscription ended because the person asked for their money back or
  // because they simply stopped paying. RevenueCat spells a refund
  // `CUSTOMER_SUPPORT`, a voluntary cancel `UNSUBSCRIBE` and a failed charge
  // `BILLING_ERROR`, so the three read very differently and cannot share a row.
  {
    id: "paywall_trigger",
    event: EVENTS.PAYWALL_VIEWED,
    property: "trigger",
    title: "Paywall Viewed by trigger",
  },
  {
    id: "subscription_period_type",
    event: EVENTS.SUBSCRIPTION_EVENT,
    property: "period_type",
    title: "Subscription Event by period type",
  },
  {
    id: "subscription_cancel_reason",
    event: EVENTS.SUBSCRIPTION_EVENT,
    property: "cancel_reason",
    title: "Subscription Event by cancel reason",
  },
  // Which plan people actually buy. The store product id carries the duration,
  // so yearly, monthly and weekly land in separate buckets and the mix can be
  // read after a price change. TEST and TRANSFER events carry no product, so
  // they sit in `unknown` rather than inflating one of the plans.
  {
    id: "subscription_product",
    event: EVENTS.SUBSCRIPTION_EVENT,
    property: "product_id",
    title: "Subscription Event by product",
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Quotes a value for a HogQL string literal.
 *
 * Backslashes and quotes are escaped in one pass, so a backslash introduced by
 * escaping a quote cannot be escaped a second time.
 */
export function quote(value) {
  return `'${String(value).replaceAll(/(['\\])/g, String.raw`\$1`)}'`;
}

/** `2026-09-02 12:00:00`, which is the shape ClickHouse parses without a hint. */
function clickhouseTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * The two seven day windows the readout compares, ending at `now`.
 *
 * Both are half open, `start <= t < end`, so the boundary instant is counted
 * once rather than in both windows.
 */
export function buildWindows(now) {
  const end = new Date(now);
  const currentStart = new Date(end.getTime() - 7 * DAY_MS);
  const previousStart = new Date(end.getTime() - 14 * DAY_MS);
  return {
    currentEnd: end,
    currentStart,
    previousStart,
  };
}

/**
 * The bucket expression, shared by every query so a row can only ever land in
 * the window its timestamp belongs to.
 */
function periodExpression(windows) {
  return `if(timestamp >= toDateTime(${quote(clickhouseTime(windows.currentStart))}, 'UTC'), 'current', 'previous')`;
}

function windowFilter(windows) {
  return [
    `timestamp >= toDateTime(${quote(clickhouseTime(windows.previousStart))}, 'UTC')`,
    `timestamp < toDateTime(${quote(clickhouseTime(windows.currentEnd))}, 'UTC')`,
  ].join("\n  AND ");
}

/**
 * The clause that keeps a query to events a person caused.
 *
 * Both halves are needed for the reason each list documents: the `$lib` allow
 * list is the definition, the event deny list is the backstop.
 */
function clientEventFilter() {
  return [
    `properties.$lib IN (${CLIENT_LIBS.map(quote).join(", ")})`,
    `event NOT IN (${SERVER_EVENTS.map(quote).join(", ")})`,
  ].join("\n  AND ");
}

/**
 * Distinct people who did something in the app or on the site.
 *
 * Server events are excluded on purpose: the readout is asking how many people
 * used the product, not how many rows the API wrote about them.
 */
export function buildActiveUsersQuery(windows) {
  return [
    "SELECT",
    `  ${periodExpression(windows)} AS period,`,
    "  count(DISTINCT person_id) AS people",
    "FROM events",
    `WHERE ${windowFilter(windows)}`,
    `  AND ${clientEventFilter()}`,
    "GROUP BY period",
  ].join("\n");
}

/**
 * The same active users, split by the build they are running.
 *
 * A person on two builds inside one window counts once per build, so the
 * buckets can add up to more than the headline. That is the point: it answers
 * "is anybody still on the old build", which a single number cannot.
 */
export function buildActiveUsersByVersionQuery(windows) {
  const value = `ifNull(nullIf(toString(properties.${APP_VERSION_PROPERTY}), ''), 'unknown')`;
  return [
    "SELECT",
    `  ${value} AS bucket,`,
    `  ${periodExpression(windows)} AS period,`,
    "  count(DISTINCT person_id) AS people",
    "FROM events",
    `WHERE ${windowFilter(windows)}`,
    `  AND ${clientEventFilter()}`,
    "GROUP BY bucket, period",
    "ORDER BY bucket, period",
  ].join("\n");
}

/**
 * How many cities the readout prints. Enough to see where the people are
 * without turning the comment into a directory of every town one person has
 * ever opened the app in.
 */
export const CITY_TABLE_ROWS = 10;

/** The bucket a person the readout cannot place lands in. */
export const CITY_UNKNOWN_BUCKET = "unknown";

/**
 * Where a person is, in the order the answer can be trusted.
 *
 * `person.properties.city` is the real one: the app reverse geocodes the device
 * location once the person allows it and sends the result on identify, so it is
 * the city they told us they are in. Being a person property rather than an
 * event property, it is their current city on every one of their events, which
 * is what keeps a person with a city in a single row.
 *
 * `$geoip_city_name` is PostHog's own guess from the request IP. Nothing in the
 * app turns GeoIP off, so it is present for everyone, but it is an IP lookup: a
 * carrier that routes through another state, or a VPN, moves the person. It is
 * the fallback, never the first answer.
 *
 * `$geoip_subdivision_1_code` carries the state and is deliberately left out.
 * Appending it would split one city between the people whose city came from the
 * app and the people whose city came from an IP, and a state that disagrees
 * with the city the person chose is worse than no state at all.
 *
 * Somebody who declined location is identified with a literal null, which
 * arrives as the string `null` rather than as an absent property, so it is ruled
 * out alongside the empty string.
 */
function cityExpression() {
  const stated = "nullIf(nullIf(toString(person.properties.city), ''), 'null')";
  const geoip = "nullIf(toString(properties.$geoip_city_name), '')";
  return `coalesce(${stated}, ${geoip}, ${quote(CITY_UNKNOWN_BUCKET)})`;
}

/**
 * The active users of {@link buildActiveUsersQuery}, split by city.
 *
 * Client events only, the same rule as the headline, so the number under a city
 * counts people who used the product there rather than rows the API wrote about
 * them.
 *
 * Every city comes back and the formatter keeps the top `CITY_TABLE_ROWS`. That
 * is deliberate: the `unknown` bucket has to be readable even in a week when it
 * is too small to make the table.
 *
 * Drafted on issue #270 to answer one question, which city gets the seeded team
 * dogs of issue #273.
 */
export function buildActiveUsersByCityQuery(windows) {
  return [
    "SELECT",
    `  ${cityExpression()} AS bucket,`,
    `  ${periodExpression(windows)} AS period,`,
    "  count(DISTINCT person_id) AS people",
    "FROM events",
    `WHERE ${windowFilter(windows)}`,
    `  AND ${clientEventFilter()}`,
    "GROUP BY bucket, period",
    "ORDER BY bucket, period",
  ].join("\n");
}

/**
 * One row per event per window, carrying both the raw count and the number of
 * distinct people behind it. The people column is what answers "how many
 * swipers", so it is cheaper to select it for every event than to run a second
 * query for the one event that needs it today.
 */
export function buildTotalsQuery(windows, events = COUNTED_EVENTS) {
  return [
    "SELECT",
    "  event,",
    `  ${periodExpression(windows)} AS period,`,
    "  count() AS total,",
    "  count(DISTINCT person_id) AS people",
    "FROM events",
    `WHERE ${windowFilter(windows)}`,
    `  AND event IN (${events.map(quote).join(", ")})`,
    "GROUP BY event, period",
    "ORDER BY event, period",
  ].join("\n");
}

/**
 * One event split by one property. Missing and empty values collapse into a
 * single `unknown` bucket so a property that stopped being sent shows up as a
 * bucket rather than as a quietly shorter table.
 */
export function buildBreakdownQuery(windows, breakdown) {
  const value = `ifNull(nullIf(toString(properties.${breakdown.property}), ''), 'unknown')`;
  return [
    "SELECT",
    `  ${value} AS bucket,`,
    `  ${periodExpression(windows)} AS period,`,
    "  count() AS total",
    "FROM events",
    `WHERE ${windowFilter(windows)}`,
    `  AND event = ${quote(breakdown.event)}`,
    "GROUP BY bucket, period",
    "ORDER BY bucket, period",
  ].join("\n");
}

/**
 * The `$lib` value that only the mobile app reports.
 *
 * Narrower than `CLIENT_LIBS` on purpose: a push lands on a phone, so a browser
 * session on the marketing site is not the person coming back from it.
 */
export const PUSH_RETURN_LIB = "posthog-react-native";

/** How long after a send an app event still counts as a return. */
export const PUSH_RETURN_WINDOW_MINUTES = 60;

/**
 * People who opened the app soon after a push aimed at them.
 *
 * This is a proxy for the open rate, and it exists because the build in the
 * store cannot emit `Push Notification Opened` at all, so the real rate reads
 * as a flat zero no matter how well the pushes work.
 *
 * It still works on that build: every screen change sends `$screen` from the
 * app, so a person who opens it after a push leaves a client event behind even
 * though nothing in the app tracks the tap itself.
 *
 * It is a proxy and not the answer. Somebody who was going to open the app in
 * that hour anyway is counted too, so read the trend rather than the level.
 *
 * The join is on `person_id` rather than on the raw distinct id because the
 * denominator this number is divided by, "Users reached by push", is itself a
 * count of distinct `person_id`. Joining on anything else would put a numerator
 * and a denominator that count different things in the same row.
 *
 * The activity side reaches `PUSH_RETURN_WINDOW_MINUTES` past the end of the
 * window so a push sent in the last minutes of it can still be credited, and
 * the push side stays inside the window so a person is only ever counted in the
 * window their push was sent in.
 *
 * One row, one window: the caller runs it twice rather than grouping, because
 * the two windows need two different activity ranges.
 */
export function buildPushAttributedReturnsQuery({ end, start }) {
  const activityEnd = new Date(
    end.getTime() + PUSH_RETURN_WINDOW_MINUTES * 60 * 1000,
  );
  return [
    "SELECT",
    "  count(DISTINCT push.person_id) AS people",
    "FROM (",
    "  SELECT person_id, timestamp AS sent_at",
    "  FROM events",
    `  WHERE event = ${quote(EVENTS.REENGAGEMENT_PUSH_SENT)}`,
    `    AND timestamp >= toDateTime(${quote(clickhouseTime(start))}, 'UTC')`,
    `    AND timestamp < toDateTime(${quote(clickhouseTime(end))}, 'UTC')`,
    ") AS push",
    "INNER JOIN (",
    "  SELECT person_id, timestamp AS acted_at",
    "  FROM events",
    `  WHERE properties.$lib = ${quote(PUSH_RETURN_LIB)}`,
    `    AND timestamp >= toDateTime(${quote(clickhouseTime(start))}, 'UTC')`,
    `    AND timestamp < toDateTime(${quote(clickhouseTime(activityEnd))}, 'UTC')`,
    ") AS activity ON activity.person_id = push.person_id",
    "WHERE activity.acted_at >= push.sent_at",
    `  AND activity.acted_at < push.sent_at + toIntervalMinute(${PUSH_RETURN_WINDOW_MINUTES})`,
  ].join("\n");
}
