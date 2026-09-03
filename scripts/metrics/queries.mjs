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

/** Distinct people with any event at all, which is the activity denominator. */
export function buildActiveUsersQuery(windows) {
  return [
    "SELECT",
    `  ${periodExpression(windows)} AS period,`,
    "  count(DISTINCT person_id) AS people",
    "FROM events",
    `WHERE ${windowFilter(windows)}`,
    "GROUP BY period",
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
