/**
 * The comment body: rows, deltas and tables, built from query results.
 *
 * Pure, so the whole formatter can be checked against fixtures. The hidden
 * marker on the first line is what lets the job find its own comment tomorrow
 * instead of leaving a new one behind every day.
 */

import {
  BREAKDOWNS,
  CITY_TABLE_ROWS,
  CITY_UNKNOWN_BUCKET,
  EVENTS,
  PUSH_RETURN_WINDOW_MINUTES,
  STORE_BUILD_COVERAGE,
} from "./queries.mjs";

export const COMMENT_MARKER = "<!-- pegada-daily-metrics -->";

const MAX_BREAKDOWN_ROWS = 12;

function number(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function utcStamp(date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * A count delta, as an absolute change and a percentage.
 *
 * A previous window of zero has no percentage to report, so it says `new`
 * rather than dividing by zero and printing an infinity.
 */
export function formatDelta(current, previous) {
  const diff = current - previous;
  if (diff === 0) {
    return "0";
  }
  const sign = diff > 0 ? "+" : "-";
  const magnitude = number(Math.abs(diff));
  if (previous === 0) {
    return `${sign}${magnitude} (new)`;
  }
  const percent = ((diff / previous) * 100).toFixed(1);
  return `${sign}${magnitude} (${diff > 0 ? "+" : ""}${percent}%)`;
}

/** A rate delta, in percentage points, because a percent of a percent reads wrong. */
export function formatRateDelta(current, previous) {
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) {
    return "0";
  }
  return `${diff > 0 ? "+" : "-"}${Math.abs(diff).toFixed(1)} pp`;
}

function formatPercent(value) {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

/** A share of a denominator, or null when the denominator is empty. */
function ratio(numerator, denominator) {
  return denominator === 0 ? null : (numerator / denominator) * 100;
}

/**
 * The single number a one row query answers with, or zero when it matched
 * nothing. ClickHouse returns no row at all for an empty join, so a missing row
 * and a zero mean the same thing here.
 */
function singleValue(rows, field = "people") {
  return Number(rows?.[0]?.[field] ?? 0);
}

/**
 * The line under the push table naming what the live build cannot send.
 *
 * Without it the zero rows read as a product that nobody uses, when what they
 * actually measure is how many people are running a build that was cut before
 * the event existed.
 */
export function coverageNote(coverage = STORE_BUILD_COVERAGE) {
  const events = coverage.missingEvents;
  if (events.length === 0) {
    return `Coverage note: build ${coverage.version} emits every event in this readout.`;
  }
  return `Coverage note: the store build ${coverage.version} cannot emit ${events.join(", ")}, so those rows read zero for anyone still on it. They measure reach, not the product.`;
}

/** A percentage row, with the delta in points and `n/a` on either empty side. */
function rateRow(label, current, previous) {
  return {
    current: formatPercent(current),
    delta:
      current === null || previous === null
        ? "n/a"
        : formatRateDelta(current, previous),
    label,
    previous: formatPercent(previous),
  };
}

/** Indexes the totals rows so a lookup cannot depend on result ordering. */
function indexTotals(rows) {
  const index = new Map();
  for (const row of rows) {
    index.set(`${row.event}::${row.period}`, {
      people: Number(row.people ?? 0),
      total: Number(row.total ?? 0),
    });
  }
  return index;
}

function totalOf(index, event, period, field) {
  return index.get(`${event}::${period}`)?.[field] ?? 0;
}

/**
 * Buckets a breakdown into one entry per value.
 *
 * `field` is which column carries the number: counts come back as `total`, the
 * version split comes back as `people`, and both render the same table.
 */
function indexBreakdown(rows, field = "total") {
  const index = new Map();
  for (const row of rows ?? []) {
    const bucket = String(row.bucket ?? "unknown");
    const entry = index.get(bucket) ?? { current: 0, previous: 0 };
    entry[row.period === "current" ? "current" : "previous"] += Number(
      row[field] ?? 0,
    );
    index.set(bucket, entry);
  }
  return index;
}

function bucketValue(rows, bucket, period) {
  return indexBreakdown(rows).get(bucket)?.[period] ?? 0;
}

/** Share of a breakdown that landed in one bucket, or null when nothing happened. */
function bucketRate(rows, bucket, period) {
  const index = indexBreakdown(rows);
  let all = 0;
  for (const entry of index.values()) {
    all += entry[period];
  }
  if (all === 0) {
    return null;
  }
  return ((index.get(bucket)?.[period] ?? 0) / all) * 100;
}

function metricTable(rows) {
  return [
    "| Metric | Last 7 days | Previous 7 days | Delta |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.label} | ${row.current} | ${row.previous} | ${row.delta} |`,
    ),
  ].join("\n");
}

function countRow(index, label, event, field = "total") {
  const current = totalOf(index, event, "current", field);
  const previous = totalOf(index, event, "previous", field);
  return {
    current: number(current),
    delta: formatDelta(current, previous),
    label,
    previous: number(previous),
  };
}

function breakdownTable(
  rows,
  { field = "total", header = "Bucket", limit = MAX_BREAKDOWN_ROWS } = {},
) {
  const index = indexBreakdown(rows, field);
  if (index.size === 0) {
    return "No events in either window.";
  }
  const ordered = [...index.entries()]
    .map(([bucket, entry]) => ({ bucket, ...entry }))
    .sort((a, b) => b.current - a.current || b.previous - a.previous)
    .slice(0, limit);

  return [
    `| ${header} | Last 7 days | Previous 7 days | Delta |`,
    "| --- | ---: | ---: | ---: |",
    ...ordered.map(
      (row) =>
        `| ${row.bucket} | ${number(row.current)} | ${number(row.previous)} | ${formatDelta(row.current, row.previous)} |`,
    ),
  ].join("\n");
}

/**
 * Where the city in the table comes from, said once under it.
 *
 * Whoever reads this row is about to pick a city to put dogs in, and the two
 * sources are not equally good: one is the city the person allowed the app to
 * read off their device, the other is a guess from an IP address.
 */
export const CITY_SOURCE_NOTE =
  "City is the one the app reverse geocoded after the person allowed location, falling back to the PostHog IP lookup and then to unknown.";

/**
 * The share of the active users the city table cannot place.
 *
 * Measured against the headline active users rather than against the sum of the
 * table, because a person whose events do not all carry the same city appears
 * in more than one row and the rows can add up to more than the headline.
 */
export function noCityLine(rows, activeCurrent, activePrevious) {
  const entry = indexBreakdown(rows, "people").get(CITY_UNKNOWN_BUCKET) ?? {
    current: 0,
    previous: 0,
  };
  const share = (people, active) =>
    `${number(people)} of ${number(active)} (${formatPercent(ratio(people, active))})`;
  return `No city: ${share(entry.current, activeCurrent)} in the last 7 days, ${share(entry.previous, activePrevious)} in the previous 7 days.`;
}

/**
 * The whole comment.
 *
 * @param {object} input
 * @param {Array} input.activeUsers rows from the active users query
 * @param {Array} input.activeUsersByCity rows from the city split
 * @param {Array} input.activeUsersByVersion rows from the version split
 * @param {Record<string, Array>} input.breakdowns rows per breakdown id
 * @param {Date} input.generatedAt when the job ran
 * @param {{ current: Array, previous: Array }} input.pushReturns rows from the push attributed returns query, one per window
 * @param {Array} input.totals rows from the totals query
 * @param {{ currentEnd: Date, currentStart: Date, previousStart: Date }} input.windows
 */
export function buildReport({
  activeUsers,
  activeUsersByCity,
  activeUsersByVersion,
  breakdowns,
  generatedAt,
  pushReturns,
  totals,
  windows,
}) {
  const index = indexTotals(totals);
  const activeCurrent = Number(
    activeUsers.find((row) => row.period === "current")?.people ?? 0,
  );
  const activePrevious = Number(
    activeUsers.find((row) => row.period === "previous")?.people ?? 0,
  );

  const upgrades = breakdowns.upgrade_type ?? [];
  const shareOptions = breakdowns.share_option ?? [];
  const pushTickets = breakdowns.push_ticket_status ?? [];

  const upgradeCurrent = bucketValue(upgrades, "success", "current");
  const upgradePrevious = bucketValue(upgrades, "success", "previous");
  const storyCurrent = bucketValue(shareOptions, "story", "current");
  const storyPrevious = bucketValue(shareOptions, "story", "previous");
  const okCurrent = bucketRate(pushTickets, "ok", "current");
  const okPrevious = bucketRate(pushTickets, "ok", "previous");

  // Opens over sends, not over tickets: a send is one nudge aimed at one
  // person, which is the thing an open rate is a share of.
  const openRate = (period) =>
    ratio(
      totalOf(index, EVENTS.PUSH_NOTIFICATION_OPENED, period, "total"),
      totalOf(index, EVENTS.REENGAGEMENT_PUSH_SENT, period, "total"),
    );
  const openRateCurrent = openRate("current");
  const openRatePrevious = openRate("previous");

  const core = metricTable([
    {
      current: number(activeCurrent),
      delta: formatDelta(activeCurrent, activePrevious),
      label: "Active users (app and site)",
      previous: number(activePrevious),
    },
    countRow(
      index,
      "New signups (Create Dog Profile)",
      EVENTS.CREATE_DOG_PROFILE,
    ),
    countRow(index, "Swipes", EVENTS.SWIPE),
    countRow(index, "Swipers (distinct)", EVENTS.SWIPE, "people"),
    countRow(index, "Matches (New Match)", EVENTS.NEW_MATCH),
    countRow(index, "Messages sent", EVENTS.MESSAGE_SENT),
    countRow(index, "Paywall views", EVENTS.PAYWALL_VIEWED),
    {
      current: number(upgradeCurrent),
      delta: formatDelta(upgradeCurrent, upgradePrevious),
      label: "Upgrades (type success)",
      previous: number(upgradePrevious),
    },
  ]);

  const sharing = metricTable([
    countRow(index, "Share Tapped", EVENTS.SHARE_TAPPED),
    countRow(index, "Share Completed", EVENTS.SHARE_COMPLETED),
    {
      current: number(storyCurrent),
      delta: formatDelta(storyCurrent, storyPrevious),
      label: "Share Completed (option story)",
      previous: number(storyPrevious),
    },
    countRow(index, "Empty Deck Shown", EVENTS.EMPTY_DECK_SHOWN),
    countRow(index, "Share Prompt Tapped", EVENTS.SHARE_PROMPT_TAPPED),
  ]);

  // The proxy for the open rate: people the push reached who then used the app
  // within the hour. It is a proxy and not the truth, because a person who was
  // going to open the app anyway lands in it too, but it moves when the pushes
  // work and the real open rate cannot.
  const reachedCurrent = totalOf(
    index,
    EVENTS.REENGAGEMENT_PUSH_SENT,
    "current",
    "people",
  );
  const reachedPrevious = totalOf(
    index,
    EVENTS.REENGAGEMENT_PUSH_SENT,
    "previous",
    "people",
  );
  const returnedCurrent = singleValue(pushReturns?.current);
  const returnedPrevious = singleValue(pushReturns?.previous);

  const push = metricTable([
    countRow(index, "Reengagement Push Sent", EVENTS.REENGAGEMENT_PUSH_SENT),
    countRow(
      index,
      "Users reached by push",
      EVENTS.REENGAGEMENT_PUSH_SENT,
      "people",
    ),
    countRow(index, "Push Ticket Result", EVENTS.PUSH_TICKET_RESULT),
    rateRow("Push Ticket Result ok rate", okCurrent, okPrevious),
    countRow(
      index,
      "Push Notification Opened",
      EVENTS.PUSH_NOTIFICATION_OPENED,
    ),
    rateRow("Push open rate", openRateCurrent, openRatePrevious),
    {
      current: number(returnedCurrent),
      delta: formatDelta(returnedCurrent, returnedPrevious),
      label: `Push attributed returns (${PUSH_RETURN_WINDOW_MINUTES} min)`,
      previous: number(returnedPrevious),
    },
    rateRow(
      "Push attributed return rate",
      ratio(returnedCurrent, reachedCurrent),
      ratio(returnedPrevious, reachedPrevious),
    ),
  ]);

  const breakdownSections = BREAKDOWNS.map((breakdown) =>
    [
      `### ${breakdown.title}`,
      "",
      breakdownTable(breakdowns[breakdown.id]),
      "",
    ].join("\n"),
  );

  return [
    COMMENT_MARKER,
    "## Daily metrics",
    "",
    `Last 7 days: ${utcStamp(windows.currentStart)} to ${utcStamp(windows.currentEnd)}.`,
    `Previous 7 days: ${utcStamp(windows.previousStart)} to ${utcStamp(windows.currentStart)}.`,
    `Updated ${utcStamp(generatedAt)}.`,
    "",
    "### Core",
    "",
    core,
    "",
    "### Sharing and deck",
    "",
    sharing,
    "",
    "### Push",
    "",
    push,
    "",
    coverageNote(),
    "",
    "### Active users by app version",
    "",
    breakdownTable(activeUsersByVersion, {
      field: "people",
      header: "App version",
    }),
    "",
    "### Active users by city",
    "",
    breakdownTable(activeUsersByCity, {
      field: "people",
      header: "City",
      limit: CITY_TABLE_ROWS,
    }),
    "",
    noCityLine(activeUsersByCity, activeCurrent, activePrevious),
    "",
    CITY_SOURCE_NOTE,
    "",
    ...breakdownSections,
    "This comment is rewritten in place by the daily metrics workflow.",
    "",
  ].join("\n");
}
