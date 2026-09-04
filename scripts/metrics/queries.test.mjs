import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BREAKDOWNS,
  CITY_TABLE_ROWS,
  CITY_UNKNOWN_BUCKET,
  CLIENT_LIBS,
  COUNTED_EVENTS,
  EVENTS,
  PUSH_RETURN_LIB,
  PUSH_RETURN_WINDOW_MINUTES,
  SERVER_EVENTS,
  STORE_BUILD_COVERAGE,
  buildActiveUsersByCityQuery,
  buildActiveUsersByVersionQuery,
  buildActiveUsersQuery,
  buildBreakdownQuery,
  buildPushAttributedReturnsQuery,
  buildTotalsQuery,
  buildWindows,
  quote,
} from "./queries.mjs";

const NOW = new Date("2026-09-02T12:00:00.000Z");

test("the windows are two adjacent seven day halves ending at now", () => {
  const windows = buildWindows(NOW);
  assert.equal(windows.currentEnd.toISOString(), "2026-09-02T12:00:00.000Z");
  assert.equal(windows.currentStart.toISOString(), "2026-08-26T12:00:00.000Z");
  assert.equal(windows.previousStart.toISOString(), "2026-08-19T12:00:00.000Z");
});

test("quote escapes what would otherwise end the literal early", () => {
  assert.equal(quote("Share Tapped"), "'Share Tapped'");
  assert.equal(quote("it's"), String.raw`'it\'s'`);
  assert.equal(quote(String.raw`back\slash`), String.raw`'back\\slash'`);
});

test("the active users query buckets by the current window start", () => {
  const query = buildActiveUsersQuery(buildWindows(NOW));
  assert.match(query, /count\(DISTINCT person_id\) AS people/);
  assert.match(
    query,
    /toDateTime\('2026-08-26 12:00:00', 'UTC'\), 'current', 'previous'/,
  );
  assert.match(
    query,
    /timestamp >= toDateTime\('2026-08-19 12:00:00', 'UTC'\)/,
  );
  assert.match(query, /timestamp < toDateTime\('2026-09-02 12:00:00', 'UTC'\)/);
  assert.match(query, /GROUP BY period/);
});

test("the active users query counts only events a person caused", () => {
  const query = buildActiveUsersQuery(buildWindows(NOW));
  assert.match(query, /properties\.\$lib IN \('posthog-react-native', 'web'\)/);
  for (const event of SERVER_EVENTS) {
    assert.ok(query.includes(quote(event)), `${event} is not excluded`);
  }
  assert.match(query, /event NOT IN \(/);
});

test("posthog-node never counts as a client library", () => {
  assert.equal(CLIENT_LIBS.includes("posthog-node"), false);
  assert.ok(CLIENT_LIBS.includes("posthog-react-native"));
  assert.ok(CLIENT_LIBS.includes("web"));
});

test("the events the API emits are all on the deny list", () => {
  for (const event of [
    "Image Moderation Result",
    "Match Created",
    "Message Sent",
    "Push Receipt Result",
    "Push Ticket Result",
    "Reengagement Push Sent",
    "Signup Attributed",
    "Subscription Event",
  ]) {
    assert.ok(SERVER_EVENTS.includes(event), `${event} is not denied`);
  }
  assert.equal(SERVER_EVENTS.includes("Swipe"), false);
  assert.equal(SERVER_EVENTS.includes("Push Notification Opened"), false);
});

test("the version split counts distinct people per build, client events only", () => {
  const query = buildActiveUsersByVersionQuery(buildWindows(NOW));
  assert.match(
    query,
    /ifNull\(nullIf\(toString\(properties\.\$app_version\), ''\), 'unknown'\) AS bucket/,
  );
  assert.match(query, /count\(DISTINCT person_id\) AS people/);
  assert.match(query, /properties\.\$lib IN \('posthog-react-native', 'web'\)/);
  assert.match(query, /GROUP BY bucket, period/);
  assert.match(
    query,
    /toDateTime\('2026-08-26 12:00:00', 'UTC'\), 'current', 'previous'/,
  );
});

test("the city split prefers the city the person gave us over the IP guess", () => {
  const query = buildActiveUsersByCityQuery(buildWindows(NOW));
  assert.match(
    query,
    /coalesce\(nullIf\(nullIf\(toString\(person\.properties\.city\), ''\), 'null'\), nullIf\(toString\(properties\.\$geoip_city_name\), ''\), 'unknown'\) AS bucket/,
  );
  // The order is the whole point: an IP lookup never overrides a city the
  // person allowed the app to read off their device.
  assert.ok(
    query.indexOf("person.properties.city") < query.indexOf("$geoip_city_name"),
  );
});

test("the city split leaves the state out so one city stays one row", () => {
  const query = buildActiveUsersByCityQuery(buildWindows(NOW));
  assert.equal(query.includes("$geoip_subdivision_1_code"), false);
});

test("the city split counts distinct people over the same client events as the headline", () => {
  const windows = buildWindows(NOW);
  const query = buildActiveUsersByCityQuery(windows);
  const headline = buildActiveUsersQuery(windows);
  assert.match(query, /count\(DISTINCT person_id\) AS people/);
  assert.match(query, /properties\.\$lib IN \('posthog-react-native', 'web'\)/);
  for (const event of SERVER_EVENTS) {
    assert.ok(query.includes(quote(event)), `${event} is not excluded`);
  }
  assert.match(query, /GROUP BY bucket, period/);
  assert.match(
    query,
    /toDateTime\('2026-08-26 12:00:00', 'UTC'\), 'current', 'previous'/,
  );
  // Same window and same filter as the headline, so a city count can be read
  // as a share of it.
  assert.ok(
    headline.includes("timestamp >= toDateTime('2026-08-19 12:00:00', 'UTC')"),
  );
  assert.ok(
    query.includes("timestamp >= toDateTime('2026-08-19 12:00:00', 'UTC')"),
  );
});

test("the city split asks for every city and leaves the trimming to the report", () => {
  const query = buildActiveUsersByCityQuery(buildWindows(NOW));
  // A LIMIT here would drop the unknown bucket in any week it is small, and
  // that bucket is how the share of unplaced people is read.
  assert.equal(query.includes("LIMIT"), false);
  assert.equal(CITY_TABLE_ROWS, 10);
  assert.equal(CITY_UNKNOWN_BUCKET, "unknown");
});

test("the totals query still counts server events, which are volume not activity", () => {
  const query = buildTotalsQuery(buildWindows(NOW));
  assert.equal(query.includes("$lib"), false);
  assert.ok(query.includes(quote("Reengagement Push Sent")));
});

test("the totals query asks for every counted event once", () => {
  const query = buildTotalsQuery(buildWindows(NOW));
  for (const event of COUNTED_EVENTS) {
    assert.ok(query.includes(quote(event)), `missing ${event}`);
  }
  assert.match(query, /count\(\) AS total/);
  assert.match(query, /count\(DISTINCT person_id\) AS people/);
  assert.match(query, /GROUP BY event, period/);
});

test("the totals query restricts to the listed events", () => {
  const query = buildTotalsQuery(buildWindows(NOW), [
    EVENTS.SWIPE,
    EVENTS.NEW_MATCH,
  ]);
  assert.match(query, /AND event IN \('Swipe', 'New Match'\)/);
});

test("a breakdown collapses missing and empty property values into one bucket", () => {
  const query = buildBreakdownQuery(buildWindows(NOW), {
    event: EVENTS.FAKE_DOOR_TAPPED,
    id: "fake_door_feature",
    property: "feature",
  });
  assert.match(
    query,
    /ifNull\(nullIf\(toString\(properties\.feature\), ''\), 'unknown'\) AS bucket/,
  );
  assert.match(query, /AND event = 'Fake Door Tapped'/);
  assert.match(query, /GROUP BY bucket, period/);
});

test("every breakdown names an event the totals query also counts", () => {
  for (const breakdown of BREAKDOWNS) {
    assert.ok(
      COUNTED_EVENTS.includes(breakdown.event),
      `${breakdown.event} is not counted`,
    );
    assert.ok(breakdown.id && breakdown.property && breakdown.title);
  }
  const ids = BREAKDOWNS.map((breakdown) => breakdown.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("the pricing breakdowns ask the paywall and the subscription the right thing", () => {
  const byId = new Map(
    BREAKDOWNS.map((breakdown) => [breakdown.id, breakdown]),
  );

  const trigger = byId.get("paywall_trigger");
  assert.equal(trigger.event, EVENTS.PAYWALL_VIEWED);
  assert.equal(trigger.property, "trigger");

  const period = byId.get("subscription_period_type");
  assert.equal(period.event, EVENTS.SUBSCRIPTION_EVENT);
  assert.equal(period.property, "period_type");

  const reason = byId.get("subscription_cancel_reason");
  assert.equal(reason.event, EVENTS.SUBSCRIPTION_EVENT);
  assert.equal(reason.property, "cancel_reason");

  const windows = buildWindows(NOW);
  assert.match(
    buildBreakdownQuery(windows, trigger),
    /ifNull\(nullIf\(toString\(properties\.trigger\), ''\), 'unknown'\) AS bucket/,
  );
  assert.match(
    buildBreakdownQuery(windows, trigger),
    /AND event = 'Paywall Viewed'/,
  );
  // A subscription event that is not a cancel has no reason, so the null side
  // of this query is most of it and has to stay a bucket rather than vanish.
  assert.match(
    buildBreakdownQuery(windows, reason),
    /ifNull\(nullIf\(toString\(properties\.cancel_reason\), ''\), 'unknown'\) AS bucket/,
  );
  assert.match(
    buildBreakdownQuery(windows, period),
    /ifNull\(nullIf\(toString\(properties\.period_type\), ''\), 'unknown'\) AS bucket/,
  );
});

test("the product breakdown reads the property the server actually sends", () => {
  const product = BREAKDOWNS.find(
    (breakdown) => breakdown.id === "subscription_product",
  );
  assert.equal(product.event, EVENTS.SUBSCRIPTION_EVENT);
  assert.equal(product.property, "product_id");
  assert.match(
    buildBreakdownQuery(buildWindows(NOW), product),
    /ifNull\(nullIf\(toString\(properties\.product_id\), ''\), 'unknown'\) AS bucket/,
  );

  // The name has to match the shared catalogue, otherwise every bucket would
  // silently be `unknown`.
  const cataloguePath = fileURLToPath(
    new URL("../../packages/shared/analytics/events.ts", import.meta.url),
  );
  assert.match(readFileSync(cataloguePath, "utf8"), /^\s+product_id\?:/m);
});

test("every event name still exists in the shared analytics catalogue", () => {
  const cataloguePath = fileURLToPath(
    new URL("../../packages/shared/analytics/events.ts", import.meta.url),
  );
  const catalogue = readFileSync(cataloguePath, "utf8");
  const declared = new Set(
    [...catalogue.matchAll(/^\s{2}[A-Z0-9_]+:\s"([^"]+)",$/gm)].map(
      (match) => match[1],
    ),
  );
  assert.ok(declared.size > 20, "the catalogue parse found almost nothing");
  for (const event of [...COUNTED_EVENTS, ...SERVER_EVENTS]) {
    assert.ok(
      declared.has(event),
      `${event} is no longer in the analytics catalogue`,
    );
  }
});

const CURRENT = {
  end: new Date("2026-09-02T12:00:00.000Z"),
  start: new Date("2026-08-26T12:00:00.000Z"),
};

test("the push returns query pairs a send with what the person did after it", () => {
  const query = buildPushAttributedReturnsQuery(CURRENT);
  assert.match(query, /count\(DISTINCT push\.person_id\) AS people/);
  assert.match(query, /WHERE event = 'Reengagement Push Sent'/);
  assert.match(query, /properties\.\$lib = 'posthog-react-native'/);
  assert.match(query, /activity\.acted_at >= push\.sent_at/);
  assert.match(
    query,
    /activity\.acted_at < push\.sent_at \+ toIntervalMinute\(60\)/,
  );
});

test("the push returns query counts app events only, never the browser", () => {
  const query = buildPushAttributedReturnsQuery(CURRENT);
  assert.equal(PUSH_RETURN_LIB, "posthog-react-native");
  assert.equal(query.includes("'web'"), false);
});

test("the sends stay inside the window and the activity reaches past its end", () => {
  const query = buildPushAttributedReturnsQuery(CURRENT);
  assert.equal(PUSH_RETURN_WINDOW_MINUTES, 60);
  // The send side closes at the window end so nobody is counted twice.
  assert.match(query, /timestamp < toDateTime\('2026-09-02 12:00:00', 'UTC'\)/);
  // The activity side runs an extra hour so a send at 11:59 can still be credited.
  assert.match(query, /timestamp < toDateTime\('2026-09-02 13:00:00', 'UTC'\)/);
  assert.match(
    query,
    /timestamp >= toDateTime\('2026-08-26 12:00:00', 'UTC'\)/,
  );
});

test("the previous window asks about its own seven days", () => {
  const windows = buildWindows(NOW);
  const query = buildPushAttributedReturnsQuery({
    end: windows.currentStart,
    start: windows.previousStart,
  });
  assert.match(
    query,
    /timestamp >= toDateTime\('2026-08-19 12:00:00', 'UTC'\)/,
  );
  assert.match(query, /timestamp < toDateTime\('2026-08-26 13:00:00', 'UTC'\)/);
  assert.equal(query.includes("2026-09-02"), false);
});

test("the coverage list holds real event names and no server event", () => {
  const known = new Set(Object.values(EVENTS));
  for (const event of STORE_BUILD_COVERAGE.missingEvents) {
    assert.ok(known.has(event), `${event} is not an event the readout counts`);
    assert.equal(
      SERVER_EVENTS.includes(event),
      false,
      `${event} comes from the server, so the app build cannot be why it is zero`,
    );
  }
  assert.ok(STORE_BUILD_COVERAGE.missingEvents.length > 0);
});

// Every name here has arrived from an `$app_version` of 1.6.2 in the events
// audit on issue #188. Excusing one of them in the coverage note would tell a
// reader that a row is zero for reach reasons when it is really zero because
// nobody did the thing.
test("the coverage list leaves out the events the store build does send", () => {
  for (const event of [
    EVENTS.CREATE_DOG_PROFILE,
    EVENTS.EMPTY_DECK_SHOWN,
    EVENTS.NEW_MATCH,
    EVENTS.PAYWALL_VIEWED,
    EVENTS.SWIPE,
    EVENTS.UPGRADE,
  ]) {
    assert.equal(STORE_BUILD_COVERAGE.missingEvents.includes(event), false);
  }
});
