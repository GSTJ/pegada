import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AUDIT_WINDOW_DAYS,
  CLIENT_LIBS,
  FUNNEL_TARGETS,
  LIB_BUCKETS,
  MAX_ROWS,
  buildAuditWindow,
  buildEventSplitQuery,
  buildEventTotalsQuery,
  buildPropertyKeysQuery,
  quote,
  resolveFunnelEvents,
} from "./events-audit-queries.mjs";

const NOW = new Date("2026-09-04T12:00:00.000Z");

test("the window is the seven days ending at now", () => {
  const window = buildAuditWindow(NOW);
  assert.equal(AUDIT_WINDOW_DAYS, 7);
  assert.equal(window.end.toISOString(), "2026-09-04T12:00:00.000Z");
  assert.equal(window.start.toISOString(), "2026-08-28T12:00:00.000Z");
});

test("quote escapes what would otherwise end the literal early", () => {
  assert.equal(quote("Paywall Viewed"), "'Paywall Viewed'");
  assert.equal(quote("it's"), String.raw`'it\'s'`);
  assert.equal(quote(String.raw`back\slash`), String.raw`'back\\slash'`);
});

test("the totals query counts every event, not a list of them", () => {
  const query = buildEventTotalsQuery(buildAuditWindow(NOW));
  assert.match(query, /GROUP BY event/);
  assert.equal(query.includes("event IN ("), false);
  assert.match(query, /count\(DISTINCT person_id\) AS people/);
  assert.match(query, /count\(DISTINCT distinct_id\) AS distinct_ids/);
  assert.match(
    query,
    /timestamp >= toDateTime\('2026-08-28 12:00:00', 'UTC'\)/,
  );
  assert.match(query, /timestamp < toDateTime\('2026-09-04 12:00:00', 'UTC'\)/);
});

test("the totals query counts anonymous rows by the shape of the distinct id", () => {
  const query = buildEventTotalsQuery(buildAuditWindow(NOW));
  assert.match(query, /countIf\(match\(distinct_id, '\^\[0-9a-fA-F\]\{8\}/);
  assert.match(query, /AS anonymous_events/);
});

test("the split query breaks down by library and app version at once", () => {
  const query = buildEventSplitQuery(buildAuditWindow(NOW));
  assert.match(query, /properties\.\$lib/);
  assert.match(query, /properties\.\$app_version/);
  assert.match(query, /GROUP BY event, lib, app_version/);
  // Missing and empty collapse into one bucket rather than two.
  assert.match(
    query,
    /ifNull\(nullIf\(toString\(properties\.\$lib\), ''\), 'unknown'\)/,
  );
});

test("the property query asks PostHog which keys the payload had", () => {
  const query = buildPropertyKeysQuery(buildAuditWindow(NOW), [
    "Swipe",
    "New Match",
  ]);
  assert.match(query, /arrayJoin\(JSONExtractKeys\(properties\)\) AS key/);
  assert.match(query, /event IN \('Swipe', 'New Match'\)/);
  assert.match(query, /GROUP BY event, key/);
});

test("the library buckets are the three SDKs, and node is never a client", () => {
  assert.deepEqual(LIB_BUCKETS, [
    "posthog-react-native",
    "web",
    "posthog-node",
  ]);
  assert.equal(CLIENT_LIBS.includes("posthog-node"), false);
});

test("the funnel covers the six events the audit is asked about", () => {
  assert.deepEqual(FUNNEL_TARGETS.map((target) => target.name).sort(), [
    "Create Dog Profile",
    "Empty Deck Shown",
    "New Match",
    "Paywall Viewed",
    "Reengagement Push Sent",
    "Swipe",
  ]);
});

test("the catalogue name wins whenever it has volume", () => {
  const resolved = resolveFunnelEvents(["Swipe", "Swiped", "Paywall Viewed"]);
  const swipe = resolved.find((entry) => entry.target === "Swipe");
  assert.deepEqual(swipe, { name: "Swipe", target: "Swipe" });
});

test("an alias is used only when the catalogue name is silent", () => {
  const resolved = resolveFunnelEvents(["Swiped", "Paywall Shown"]);
  assert.deepEqual(
    resolved.find((entry) => entry.target === "Swipe"),
    { name: "Swiped", target: "Swipe" },
  );
  assert.deepEqual(
    resolved.find((entry) => entry.target === "Paywall Viewed"),
    { name: "Paywall Shown", target: "Paywall Viewed" },
  );
  // Nothing arrived for this one, so it keeps its catalogue name and reports
  // zero rather than disappearing from the readout.
  assert.deepEqual(
    resolved.find((entry) => entry.target === "New Match"),
    { name: "New Match", target: "New Match" },
  );
});

test("every query states its own row limit", () => {
  // PostHog caps an unbounded HogQL query at 100 rows, and a cut answer reads
  // as an event with no properties rather than as an error.
  const window = buildAuditWindow(NOW);
  assert.ok(MAX_ROWS > 1000);
  for (const query of [
    buildEventTotalsQuery(window),
    buildEventSplitQuery(window),
    buildPropertyKeysQuery(window, ["Swipe"]),
  ]) {
    assert.match(query, new RegExp(`LIMIT ${MAX_ROWS}$`));
  }
});
