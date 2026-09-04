/**
 * HogQL builders for the events audit.
 *
 * Three queries answer the whole readout: what came in, who sent it, and what
 * the funnel events carried. Everything here is pure, so the query surface is
 * checkable without a PostHog key, the same arrangement `queries.mjs` uses for
 * the daily readout.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far back the audit looks. */
export const AUDIT_WINDOW_DAYS = 7;

/**
 * The row cap every query states out loud.
 *
 * PostHog applies `LIMIT 100` to a HogQL query that does not bring its own,
 * and a truncated answer here does not look like an error: it looks like an
 * event with no properties. The first run of this audit reported `Swipe` as
 * missing all three of its required keys for exactly that reason. High enough
 * to never be reached by this project, and stated so the day it is reached is
 * a number that stops moving rather than a silent cut.
 */
export const MAX_ROWS = 10_000;

/**
 * The `$lib` values that get a column of their own, in report order.
 *
 * Anything else lands in `other`, which is where a rogue integration or a
 * proxy that rewrites `$lib` would show up rather than quietly joining the app.
 */
export const LIB_BUCKETS = ["posthog-react-native", "web", "posthog-node"];

/** The libraries a person is behind, so app version only applies to those. */
export const CLIENT_LIBS = ["posthog-react-native", "web"];

/** The property posthog-react-native puts the build number on. */
export const APP_VERSION_PROPERTY = "$app_version";

/**
 * The funnel events the audit checks property by property, and the other names
 * each one has plausibly been sent under.
 *
 * The aliases exist because the brief cannot assume the catalogue name is the
 * one in PostHog: an event renamed in code keeps sending the old name from
 * every build already on a phone. A target resolves to its catalogue name when
 * that name has volume, and to an alias only when it does not.
 */
export const FUNNEL_TARGETS = [
  {
    aliases: ["Paywall Shown", "Paywall Opened"],
    name: "Paywall Viewed",
  },
  {
    aliases: ["Swiped", "Card Swiped", "Dog Swiped", "Swipe Card"],
    name: "Swipe",
  },
  { aliases: ["Match", "Match Created"], name: "New Match" },
  { aliases: ["Dog Profile Created"], name: "Create Dog Profile" },
  { aliases: ["Empty Deck"], name: "Empty Deck Shown" },
  { aliases: ["Re-engagement Push Sent"], name: "Reengagement Push Sent" },
];

/**
 * Quotes a value for a HogQL string literal, escaping backslashes and quotes
 * in one pass so an escape cannot be escaped twice.
 */
export function quote(value) {
  return `'${String(value).replaceAll(/(['\\])/g, String.raw`\$1`)}'`;
}

/** `2026-09-04 12:00:00`, the shape ClickHouse parses without a hint. */
function clickhouseTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** The single seven day window, half open so the boundary counts once. */
export function buildAuditWindow(now) {
  const end = new Date(now);
  return { end, start: new Date(end.getTime() - AUDIT_WINDOW_DAYS * DAY_MS) };
}

function windowFilter(window) {
  return [
    `timestamp >= toDateTime(${quote(clickhouseTime(window.start))}, 'UTC')`,
    `timestamp < toDateTime(${quote(clickhouseTime(window.end))}, 'UTC')`,
  ].join("\n  AND ");
}

/**
 * Every event name in the window with its per event totals.
 *
 * People are counted here rather than in the split query below because a
 * person on two builds is one person: summing distinct counts across buckets
 * would report more users than the project has.
 *
 * `anonymous_events` uses the shape of the distinct id. The app identifies with
 * the user's cuid, and posthog-react-native's own device id is a uuid, so a row
 * whose distinct id is a uuid is a row PostHog never saw a login for. It is a
 * heuristic, and it is the only one available without reading person profiles
 * for every row.
 */
export function buildEventTotalsQuery(window) {
  const anonymous = `match(distinct_id, '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')`;
  return [
    "SELECT",
    "  event,",
    "  count() AS total,",
    "  count(DISTINCT person_id) AS people,",
    "  count(DISTINCT distinct_id) AS distinct_ids,",
    `  countIf(${anonymous}) AS anonymous_events`,
    "FROM events",
    `WHERE ${windowFilter(window)}`,
    "GROUP BY event",
    "ORDER BY total DESC, event",
    `LIMIT ${MAX_ROWS}`,
  ].join("\n");
}

/**
 * The same events split by the library that sent them and, for the app, by the
 * build the phone was running.
 *
 * Counts only. See above for why the people column is not repeated here.
 */
export function buildEventSplitQuery(window) {
  const lib = `ifNull(nullIf(toString(properties.$lib), ''), 'unknown')`;
  const version = `ifNull(nullIf(toString(properties.${APP_VERSION_PROPERTY}), ''), 'unknown')`;
  return [
    "SELECT",
    "  event,",
    `  ${lib} AS lib,`,
    `  ${version} AS app_version,`,
    "  count() AS total",
    "FROM events",
    `WHERE ${windowFilter(window)}`,
    "GROUP BY event, lib, app_version",
    "ORDER BY event, lib, app_version",
    `LIMIT ${MAX_ROWS}`,
  ].join("\n");
}

/**
 * One row per property key per funnel event, with how many events carried it.
 *
 * `JSONExtractKeys` is the only way to ask PostHog what keys an event actually
 * has: dot access needs the key name up front, which is the thing being looked
 * for. Divided by the event's total from {@link buildEventTotalsQuery}, the
 * count is also the answer to "what share is missing this key", so the audit
 * does not need a second query listing keys it already expects.
 *
 * A key sent with a null value counts as present, because that is what the
 * payload says. The readout states this where it matters.
 */
export function buildPropertyKeysQuery(window, events) {
  return [
    "SELECT",
    "  event,",
    "  arrayJoin(JSONExtractKeys(properties)) AS key,",
    "  count() AS total",
    "FROM events",
    `WHERE ${windowFilter(window)}`,
    `  AND event IN (${events.map(quote).join(", ")})`,
    "GROUP BY event, key",
    "ORDER BY event, key",
    `LIMIT ${MAX_ROWS}`,
  ].join("\n");
}

/**
 * Picks the name each funnel target is really sent under.
 *
 * The catalogue name wins whenever it has volume, so an alias can never take a
 * live event's place; an alias is only reported when the catalogue name is
 * silent and the alias is not.
 */
export function resolveFunnelEvents(seenEvents, targets = FUNNEL_TARGETS) {
  const seen = new Set(seenEvents);
  return targets.map((target) => {
    if (seen.has(target.name)) {
      return { name: target.name, target: target.name };
    }
    const alias = target.aliases.find((candidate) => seen.has(candidate));
    return { name: alias ?? target.name, target: target.name };
  });
}

/** How many exception groups the audit prints before it stops. */
export const MAX_EXCEPTION_GROUPS = 15;

/**
 * How much of an exception message survives into the table.
 *
 * Long enough to tell two failures of the same type apart, short enough that a
 * stack trace pasted into the message does not push every other column off the
 * side of the comment.
 */
export const EXCEPTION_MESSAGE_LENGTH = 120;

/**
 * The busiest exception groups in the window, one row per type and message.
 *
 * `$exception` is the only autocapture event that is a bug report rather than a
 * measurement, and it arrives from both the app and the API, so the group alone
 * does not say who is broken. `libs` and `app_versions` are collected inside the
 * group instead of being grouped on: splitting a single failure across a row per
 * library would push the real leader down the table and hide that the same
 * exception is happening in two places.
 *
 * The message is truncated in ClickHouse rather than in the renderer so the
 * grouping itself is on the truncated value. Two exceptions that differ only in
 * a trailing id are one fault, and counting them apart is how a fault that is
 * happening constantly reads as fifteen rare ones.
 *
 * `$exception_type` and `$exception_message` are what PostHog's error tracking
 * writes. A client that sent an exception without them lands in `unknown`,
 * which is a group worth seeing rather than a row worth dropping.
 */
export function buildExceptionGroupsQuery(
  window,
  limit = MAX_EXCEPTION_GROUPS,
) {
  const lib = `ifNull(nullIf(toString(properties.$lib), ''), 'unknown')`;
  const version = `ifNull(nullIf(toString(properties.${APP_VERSION_PROPERTY}), ''), 'unknown')`;
  const type = `ifNull(nullIf(toString(properties.$exception_type), ''), 'unknown')`;
  const message = `ifNull(nullIf(toString(properties.$exception_message), ''), 'unknown')`;
  const clientLibs = CLIENT_LIBS.map(quote).join(", ");
  return [
    "SELECT",
    `  ${type} AS exception_type,`,
    `  substring(${message}, 1, ${EXCEPTION_MESSAGE_LENGTH}) AS message,`,
    "  count() AS total,",
    "  count(DISTINCT person_id) AS people,",
    `  arrayStringConcat(arraySort(groupUniqArray(${lib})), ', ') AS libs,`,
    `  arrayStringConcat(arraySort(groupUniqArrayIf(${version}, ${lib} IN (${clientLibs}))), ', ') AS app_versions`,
    "FROM events",
    `WHERE ${windowFilter(window)}`,
    "  AND event = '$exception'",
    "GROUP BY exception_type, message",
    "ORDER BY total DESC, exception_type, message",
    `LIMIT ${limit}`,
  ].join("\n");
}
