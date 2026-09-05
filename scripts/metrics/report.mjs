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
  DECK_TIERS,
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

/**
 * A mean delta, as a plain difference rather than a percentage.
 *
 * An average page size moving from 8.0 to 8.4 is worth half a card, and saying
 * it grew five percent hides which half of the fraction moved.
 */
export function formatAverageDelta(current, previous) {
  if (current === null || previous === null) {
    return "n/a";
  }
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) {
    return "0";
  }
  return `${diff > 0 ? "+" : "-"}${Math.abs(diff).toFixed(1)}`;
}

function formatPercent(value) {
  return value === null ? "n/a" : `${value.toFixed(1)}%`;
}

function formatAverage(value) {
  return value === null ? "n/a" : value.toFixed(1);
}

/** A mean, or null when there is nothing to divide by. */
function mean(total, count) {
  return count === 0 ? null : total / count;
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
  const gap = `Coverage note: the store build ${coverage.version} cannot emit ${events.join(", ")}, so those rows read zero for anyone still on it. They measure reach, not the product.`;
  const updated = coverage.otaEvents ?? [];
  if (updated.length === 0) {
    return gap;
  }
  const one = updated.length === 1;
  return `${gap} ${updated.join(", ")} ${one ? "is" : "are"} the exception: the over the air update of ${coverage.otaDate} carries ${one ? "it" : "them"} to the ${coverage.version} runtime, so ${one ? "that row fills" : "those rows fill"} from every phone that has taken the update and the gap is only the devices that have not.`;
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

/** An average row, printed to one decimal with the difference as the delta. */
function averageRow(label, current, previous) {
  return {
    current: formatAverage(current),
    delta: formatAverageDelta(current, previous),
    label,
    previous: formatAverage(previous),
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

/** A count row built from two numbers the totals index does not carry. */
function valueRow(label, current, previous) {
  return {
    current: number(current),
    delta: formatDelta(current, previous),
    label,
    previous: number(previous),
  };
}

function countRow(index, label, event, field = "total") {
  return valueRow(
    label,
    totalOf(index, event, "current", field),
    totalOf(index, event, "previous", field),
  );
}

/**
 * The deck supply rows, keyed by the window they describe.
 *
 * ClickHouse leaves a window out entirely when nothing was served in it, so a
 * missing row and a row of zeroes have to mean the same thing here.
 */
function indexDeckSupply(rows) {
  const index = new Map();
  for (const row of rows ?? []) {
    index.set(row.period === "current" ? "current" : "previous", row);
  }
  return index;
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
 * @param {Array} input.deckSupply rows from the deck supply query, one per window
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
  deckSupply,
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
    valueRow("Active users (app and site)", activeCurrent, activePrevious),
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
    valueRow("Upgrades (type success)", upgradeCurrent, upgradePrevious),
  ]);

  const sharing = metricTable([
    countRow(index, "Share Tapped", EVENTS.SHARE_TAPPED),
    countRow(index, "Share Completed", EVENTS.SHARE_COMPLETED),
    valueRow("Share Completed (option story)", storyCurrent, storyPrevious),
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
    // The other side of the cadence. A send count on its own cannot tell a week
    // when nobody was due a nudge from a week when the cron was broken, and
    // these two rows are what separate the two.
    countRow(
      index,
      "Reengagement Push Suppressed",
      EVENTS.REENGAGEMENT_PUSH_SUPPRESSED,
    ),
    countRow(
      index,
      "Users held back from a push",
      EVENTS.REENGAGEMENT_PUSH_SUPPRESSED,
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
    valueRow(
      `Push attributed returns (${PUSH_RETURN_WINDOW_MINUTES} min)`,
      returnedCurrent,
      returnedPrevious,
    ),
    rateRow(
      "Push attributed return rate",
      ratio(returnedCurrent, reachedCurrent),
      ratio(returnedPrevious, reachedPrevious),
    ),
  ]);

  // What the deck handed out, against what the app asked for. The tier rows
  // say whether the fallbacks are carrying the deck or the primary query
  // already covered it, and the short share is how often they had anything to
  // do at all.
  const deckRows = indexDeckSupply(deckSupply);
  const deckField = (period, field) =>
    Number(deckRows.get(period)?.[field] ?? 0);

  const pagesCurrent = deckField("current", "pages");
  const pagesPrevious = deckField("previous", "pages");
  const perPageCurrent = mean(deckField("current", "served"), pagesCurrent);
  const perPagePrevious = mean(deckField("previous", "served"), pagesPrevious);
  const shortCurrent = ratio(deckField("current", "short_pages"), pagesCurrent);
  const shortPrevious = ratio(
    deckField("previous", "short_pages"),
    pagesPrevious,
  );

  const deck = metricTable([
    countRow(index, "Deck Served", EVENTS.DECK_SERVED),
    countRow(index, "Swipers served a deck", EVENTS.DECK_SERVED, "people"),
    averageRow("Cards served per page", perPageCurrent, perPagePrevious),
    ...DECK_TIERS.map((tier) =>
      valueRow(
        `Cards from ${tier.id}`,
        deckField("current", tier.property),
        deckField("previous", tier.property),
      ),
    ),
    rateRow(
      "Short pages (served under requested)",
      shortCurrent,
      shortPrevious,
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
    "### Deck",
    "",
    deck,
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
