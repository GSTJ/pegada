import assert from "node:assert/strict";
import { test } from "node:test";

import { STORE_BUILD_COVERAGE, buildWindows } from "./queries.mjs";
import {
  CITY_SOURCE_NOTE,
  COMMENT_MARKER,
  OTA_SOURCE_NOTE,
  buildReport,
  coverageNote,
  formatAverageDelta,
  formatDelta,
  formatRateDelta,
  noCityLine,
} from "./report.mjs";

const NOW = new Date("2026-09-02T12:00:00.000Z");

function totals(rows) {
  return rows.map(([event, period, total, people]) => ({
    event,
    people,
    period,
    total,
  }));
}

function breakdown(rows) {
  return rows.map(([bucket, period, total]) => ({ bucket, period, total }));
}

function versions(rows) {
  return rows.map(([bucket, period, people]) => ({ bucket, people, period }));
}

/** The city split comes back in the same shape as the version split. */
const cities = versions;

function otaRows(rows) {
  return rows.map(
    ([runtime_version, update_id, launched_from, people, first_seen]) => ({
      first_seen,
      launched_from,
      people,
      runtime_version,
      update_id,
    }),
  );
}

function deck(rows) {
  return rows.map(
    ([
      period,
      pages,
      served,
      requested,
      primary_count,
      beyond_radius_count,
      same_gender_count,
      recycled_count,
      short_pages,
    ]) => ({
      beyond_radius_count,
      pages,
      period,
      primary_count,
      recycled_count,
      requested,
      same_gender_count,
      served,
      short_pages,
    }),
  );
}

const FIXTURE = {
  activeUsers: [
    { people: 1240, period: "current" },
    { people: 1100, period: "previous" },
  ],
  activeUsersByCity: cities([
    ["Sao Paulo", "current", 420],
    ["Sao Paulo", "previous", 400],
    ["Rio de Janeiro", "current", 260],
    ["Rio de Janeiro", "previous", 300],
    ["Belo Horizonte", "current", 140],
    ["Belo Horizonte", "previous", 120],
    ["Curitiba", "current", 90],
    ["Porto Alegre", "current", 80],
    ["Recife", "current", 70],
    ["Salvador", "current", 60],
    ["Brasilia", "current", 50],
    ["Fortaleza", "current", 40],
    ["Manaus", "current", 30],
    ["Belem", "current", 20],
    ["Natal", "current", 10],
    ["unknown", "current", 124],
    ["unknown", "previous", 220],
  ]),
  activeUsersByVersion: versions([
    ["1.4.0", "current", 900],
    ["1.4.0", "previous", 210],
    ["1.3.2", "current", 320],
    ["1.3.2", "previous", 870],
    ["unknown", "current", 20],
    ["unknown", "previous", 20],
  ]),
  otaUpdates: otaRows([
    ["1.7.2", "a1b2c3d4", "downloaded", 780, "2026-08-27 04:10:00"],
    ["1.6.2", "9f8e7d6c", "embedded", 300, "2026-08-26 12:05:00"],
    ["1.6.2", "4b5c6d7e", "downloaded", 40, "2026-09-02 06:45:00"],
    ["unknown", "unknown", "unknown", 12, null],
  ]),
  breakdowns: {
    fake_door_feature: breakdown([
      ["ai_story_video", "current", 31],
      ["ai_story_video", "previous", 12],
      ["referral_reward", "current", 4],
    ]),
    moderation_verdict: breakdown([
      ["approve", "current", 400],
      ["approve", "previous", 380],
      ["reject", "current", 9],
      ["reject", "previous", 14],
      ["error", "current", 2],
    ]),
    paywall_trigger: breakdown([
      ["like_limit", "current", 180],
      ["like_limit", "previous", 150],
      ["profile_plan", "current", 90],
      ["profile_plan", "previous", 60],
      ["swipe_back", "current", 30],
      ["unknown", "current", 5],
    ]),
    push_suppressed_reason: breakdown([
      ["cooldown", "current", 140],
      ["cooldown", "previous", 20],
      ["monthly_cap", "current", 60],
      ["monthly_cap", "previous", 8],
      ["window", "current", 40],
      ["gave_up", "current", 12],
      ["dead_token", "current", 8],
      ["dead_token", "previous", 12],
    ]),
    push_ticket_status: breakdown([
      ["ok", "current", 90],
      ["error", "current", 10],
      ["ok", "previous", 96],
      ["error", "previous", 4],
    ]),
    share_option: breakdown([
      ["story", "current", 40],
      ["story", "previous", 10],
      ["link", "current", 20],
      ["copy_link", "current", 5],
    ]),
    signup_ref: breakdown([
      ["organic", "current", 50],
      ["organic", "previous", 55],
      ["unknown", "current", 3],
    ]),
    subscription_cancel_reason: breakdown([
      ["UNSUBSCRIBE", "current", 6],
      ["UNSUBSCRIBE", "previous", 4],
      ["CUSTOMER_SUPPORT", "current", 2],
      ["BILLING_ERROR", "current", 1],
      ["unknown", "current", 28],
    ]),
    subscription_product: breakdown([
      ["pegada_yearly", "current", 18],
      ["pegada_yearly", "previous", 11],
      ["pegada_monthly", "current", 9],
      ["pegada_monthly", "previous", 14],
      ["pegada_weekly", "current", 4],
      ["unknown", "current", 1],
    ]),
    subscription_period_type: breakdown([
      ["TRIAL", "current", 14],
      ["TRIAL", "previous", 9],
      ["NORMAL", "current", 21],
      ["NORMAL", "previous", 18],
      ["INTRO", "current", 3],
    ]),
    subscription_type: breakdown([
      ["INITIAL_PURCHASE", "current", 7],
      ["RENEWAL", "current", 21],
      ["CANCELLATION", "current", 2],
      ["RENEWAL", "previous", 18],
    ]),
    upgrade_type: breakdown([
      ["success", "current", 12],
      ["success", "previous", 8],
      ["cancel", "current", 30],
      ["error", "current", 1],
    ]),
  },
  deckSupply: deck([
    ["current", 100, 840, 1000, 700, 90, 30, 20, 40],
    ["previous", 80, 560, 800, 560, 0, 0, 0, 48],
  ]),
  generatedAt: NOW,
  pushReturns: {
    current: [{ people: 200 }],
    previous: [{ people: 160 }],
  },
  totals: totals([
    ["Create Dog Profile", "current", 120, 118],
    ["Create Dog Profile", "previous", 150, 149],
    ["Swipe", "current", 5400, 300],
    ["Swipe", "previous", 5000, 280],
    ["New Match", "current", 210, 180],
    ["New Match", "previous", 210, 175],
    ["Message Sent", "current", 900, 210],
    ["Paywall Viewed", "current", 300, 250],
    ["Paywall Viewed", "previous", 240, 200],
    ["Share Tapped", "current", 80, 70],
    ["Share Tapped", "previous", 60, 55],
    ["Share Completed", "current", 65, 60],
    ["Share Completed", "previous", 30, 28],
    ["Empty Deck Shown", "current", 400, 220],
    ["Share Prompt Tapped", "current", 45, 40],
    ["Deck Served", "current", 100, 40],
    ["Deck Served", "previous", 80, 35],
    ["Reengagement Push Sent", "current", 1000, 800],
    ["Reengagement Push Suppressed", "current", 260, 210],
    ["Reengagement Push Suppressed", "previous", 40, 32],
    ["Push Ticket Result", "current", 100, 90],
    ["Push Ticket Result", "previous", 100, 88],
    ["Push Notification Opened", "current", 140, 120],
    ["Push Notification Opened", "previous", 100, 95],
  ]),
  windows: buildWindows(NOW),
};

test("a delta carries a plain sign and a percentage", () => {
  assert.equal(formatDelta(140, 100), "+40 (+40.0%)");
  assert.equal(formatDelta(80, 100), "-20 (-20.0%)");
  assert.equal(formatDelta(100, 100), "0");
  assert.equal(formatDelta(0, 0), "0");
  assert.equal(formatDelta(0, 25), "-25 (-100.0%)");
});

test("a delta against an empty previous window says new instead of dividing by zero", () => {
  assert.equal(formatDelta(7, 0), "+7 (new)");
  assert.equal(formatDelta(2500, 0), "+2,500 (new)");
});

test("a rate delta is reported in percentage points", () => {
  assert.equal(formatRateDelta(90, 96), "-6.0 pp");
  assert.equal(formatRateDelta(96.4, 90.1), "+6.3 pp");
  assert.equal(formatRateDelta(90, 90), "0");
  assert.equal(formatRateDelta(90.01, 90), "0");
});

test("the report opens with the marker so tomorrow's run can find it", () => {
  const body = buildReport(FIXTURE);
  assert.ok(body.startsWith(COMMENT_MARKER));
  assert.equal(body.split(COMMENT_MARKER).length - 1, 1);
});

test("the report states both windows and when it ran", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /Last 7 days: 2026-08-26 12:00 UTC to 2026-09-02 12:00 UTC\./,
  );
  assert.match(
    body,
    /Previous 7 days: 2026-08-19 12:00 UTC to 2026-08-26 12:00 UTC\./,
  );
  assert.match(body, /Updated 2026-09-02 12:00 UTC\./);
});

test("the core table reports counts, distinct people and deltas", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /\| Active users \(app and site\) \| 1,240 \| 1,100 \| \+140 \(\+12\.7%\) \|/,
  );
  assert.match(
    body,
    /\| New signups \(Create Dog Profile\) \| 120 \| 150 \| -30 \(-20\.0%\) \|/,
  );
  assert.match(body, /\| Swipes \| 5,400 \| 5,000 \| \+400 \(\+8\.0%\) \|/);
  assert.match(
    body,
    /\| Swipers \(distinct\) \| 300 \| 280 \| \+20 \(\+7\.1%\) \|/,
  );
  assert.match(body, /\| Matches \(New Match\) \| 210 \| 210 \| 0 \|/);
  assert.match(body, /\| Messages sent \| 900 \| 0 \| \+900 \(new\) \|/);
});

test("successful upgrades come from the upgrade breakdown, not the raw event count", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /\| Upgrades \(type success\) \| 12 \| 8 \| \+4 \(\+50\.0%\) \|/,
  );
});

test("the story shares are split out of Share Completed", () => {
  const body = buildReport(FIXTURE);
  assert.match(body, /\| Share Completed \| 65 \| 30 \| \+35 \(\+116\.7%\) \|/);
  assert.match(
    body,
    /\| Share Completed \(option story\) \| 40 \| 10 \| \+30 \(\+300\.0%\) \|/,
  );
});

test("the app version table splits the active users by build", () => {
  const body = buildReport(FIXTURE);
  assert.ok(body.includes("### Active users by app version"));
  const [, versionSection] = body.split("### Active users by app version");
  assert.match(versionSection, /\| App version \| Last 7 days \|/);
  assert.match(
    versionSection,
    /\| 1\.4\.0 \| 900 \| 210 \| \+690 \(\+328\.6%\) \|/,
  );
  assert.match(
    versionSection,
    /\| 1\.3\.2 \| 320 \| 870 \| -550 \(-63\.2%\) \|/,
  );
  assert.ok(
    versionSection.indexOf("| 1.4.0 |") < versionSection.indexOf("| 1.3.2 |"),
  );
});

test("a missing app version split says so instead of rendering an empty table", () => {
  const body = buildReport({ ...FIXTURE, activeUsersByVersion: [] });
  const [, versionSection] = body.split("### Active users by app version");
  assert.match(versionSection, /^\n\nNo events in either window\./);
});

test("the city table names the top ten and stops there", () => {
  const body = buildReport(FIXTURE);
  assert.ok(body.includes("### Active users by city"));
  const [, citySection] = body.split("### Active users by city");
  assert.match(citySection, /\| City \| Last 7 days \|/);
  assert.match(
    citySection,
    /\| Sao Paulo \| 420 \| 400 \| \+20 \(\+5\.0%\) \|/,
  );
  assert.match(
    citySection,
    /\| Rio de Janeiro \| 260 \| 300 \| -40 \(-13\.3%\) \|/,
  );
  assert.ok(
    citySection.indexOf("| Sao Paulo |") <
      citySection.indexOf("| Rio de Janeiro |"),
  );
  // Fifteen cities and an unknown bucket went in, ten rows come out, and the
  // unknown bucket earns its row on size like any other.
  assert.match(citySection, /\| unknown \| 124 \| 220 \| -96 \(-43\.6%\) \|/);
  assert.ok(citySection.includes("| Fortaleza |"));
  assert.equal(citySection.includes("| Manaus |"), false);
  assert.equal(citySection.includes("| Natal |"), false);
  const [table] = citySection.split("No city:");
  assert.equal(
    table.split("\n").filter((line) => line.startsWith("| ")).length,
    12,
  );
});

test("the unplaced people are a share of the headline, not of the table", () => {
  const body = buildReport(FIXTURE);
  // 124 of the 1,240 active users this week, 220 of the 1,100 the week before.
  assert.match(
    body,
    /No city: 124 of 1,240 \(10\.0%\) in the last 7 days, 220 of 1,100 \(20\.0%\) in the previous 7 days\./,
  );
  assert.ok(body.includes(CITY_SOURCE_NOTE));
});

test("a week nobody used the app reports no share rather than a division", () => {
  assert.equal(
    noCityLine([], 0, 0),
    "No city: 0 of 0 (n/a) in the last 7 days, 0 of 0 (n/a) in the previous 7 days.",
  );
});

test("every active user counts as unplaced when no city ever arrives", () => {
  const line = noCityLine(
    [{ bucket: "unknown", people: 12, period: "current" }],
    12,
    0,
  );
  assert.match(line, /No city: 12 of 12 \(100\.0%\) in the last 7 days/);
});

test("a missing city split says so instead of rendering an empty table", () => {
  const body = buildReport({ ...FIXTURE, activeUsersByCity: [] });
  const [, citySection] = body.split("### Active users by city");
  assert.match(citySection, /^\n\nNo events in either window\./);
  assert.match(citySection, /No city: 0 of 1,240 \(0\.0%\)/);
});

test("the push table reports how many people a send reached", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /\| Reengagement Push Sent \| 1,000 \| 0 \| \+1,000 \(new\) \|/,
  );
  assert.match(
    body,
    /\| Users reached by push \| 800 \| 0 \| \+800 \(new\) \|/,
  );
});

test("the push open rate is opens over sends", () => {
  const body = buildReport(FIXTURE);
  assert.match(body, /\| Push open rate \| 14\.0% \| n\/a \| n\/a \|/);
});

test("the push open rate is n/a rather than infinite when nothing was sent", () => {
  const body = buildReport({ ...FIXTURE, totals: [] });
  assert.match(body, /\| Push open rate \| n\/a \| n\/a \| n\/a \|/);
});

test("the push ok rate is a share of the tickets in each window", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /\| Push Ticket Result ok rate \| 90\.0% \| 96\.0% \| -6\.0 pp \|/,
  );
});

test("the push table counts the nudges the cadence held back", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /\| Reengagement Push Suppressed \| 260 \| 40 \| \+220 \(\+550\.0%\) \|/,
  );
  assert.match(
    body,
    /\| Users held back from a push \| 210 \| 32 \| \+178 \(\+556\.3%\) \|/,
  );
  // A suppression is only readable next to the send it replaced, so both rows
  // sit in the push table rather than in a section of their own.
  const [, pushSection] = body.split("### Push");
  assert.ok(
    pushSection.indexOf("| Reengagement Push Sent |") <
      pushSection.indexOf("| Reengagement Push Suppressed |"),
  );
});

test("the suppression reasons separate the caps from a dead phone", () => {
  const body = buildReport(FIXTURE);
  const [, reasons] = body.split("### Reengagement Push Suppressed by reason");
  assert.match(reasons, /\| cooldown \| 140 \| 20 \| \+120 \(\+600\.0%\) \|/);
  assert.match(reasons, /\| monthly_cap \| 60 \| 8 \| \+52 \(\+650\.0%\) \|/);
  assert.match(reasons, /\| gave_up \| 12 \| 0 \| \+12 \(new\) \|/);
  assert.match(reasons, /\| dead_token \| 8 \| 12 \| -4 \(-33\.3%\) \|/);
  assert.ok(reasons.indexOf("| cooldown |") < reasons.indexOf("| window |"));
});

test("the deck table reports the pages, the page size and the tiers behind it", () => {
  const body = buildReport(FIXTURE);
  assert.ok(body.includes("### Deck"));
  const [, deckSection] = body.split("### Deck");
  assert.match(
    deckSection,
    /\| Deck Served \| 100 \| 80 \| \+20 \(\+25\.0%\) \|/,
  );
  assert.match(
    deckSection,
    /\| Swipers served a deck \| 40 \| 35 \| \+5 \(\+14\.3%\) \|/,
  );
  // 840 cards over 100 pages against 560 over 80.
  assert.match(
    deckSection,
    /\| Cards served per page \| 8\.4 \| 7\.0 \| \+1\.4 \|/,
  );
  assert.match(
    deckSection,
    /\| Cards from primary \| 700 \| 560 \| \+140 \(\+25\.0%\) \|/,
  );
  assert.match(
    deckSection,
    /\| Cards from beyond_radius \| 90 \| 0 \| \+90 \(new\) \|/,
  );
  assert.match(
    deckSection,
    /\| Cards from same_gender \| 30 \| 0 \| \+30 \(new\) \|/,
  );
  assert.match(
    deckSection,
    /\| Cards from recycled_pass \| 20 \| 0 \| \+20 \(new\) \|/,
  );
  // 40 of 100 pages came back short, against 48 of 80 the week before.
  assert.match(
    deckSection,
    /\| Short pages \(served under requested\) \| 40\.0% \| 60\.0% \| -20\.0 pp \|/,
  );
});

test("the deck table sits between the sharing table and the push table", () => {
  const body = buildReport(FIXTURE);
  assert.ok(body.indexOf("### Sharing and deck") < body.indexOf("### Deck\n"));
  assert.ok(body.indexOf("### Deck\n") < body.indexOf("### Push"));
});

test("a week the deck served nothing reports no page size rather than a division", () => {
  const body = buildReport({ ...FIXTURE, deckSupply: [] });
  const [, deckSection] = body.split("### Deck");
  assert.match(
    deckSection,
    /\| Cards served per page \| n\/a \| n\/a \| n\/a \|/,
  );
  assert.match(
    deckSection,
    /\| Short pages \(served under requested\) \| n\/a \| n\/a \| n\/a \|/,
  );
  assert.match(deckSection, /\| Cards from primary \| 0 \| 0 \| 0 \|/);
});

test("the deck rows survive a query that answered with no rows at all", () => {
  const body = buildReport({ ...FIXTURE, deckSupply: undefined });
  const [, deckSection] = body.split("### Deck");
  assert.match(
    deckSection,
    /\| Cards served per page \| n\/a \| n\/a \| n\/a \|/,
  );
});

test("an average delta is a plain difference, not a percentage", () => {
  assert.equal(formatAverageDelta(8.4, 7), "+1.4");
  assert.equal(formatAverageDelta(7, 8.4), "-1.4");
  assert.equal(formatAverageDelta(8, 8), "0");
  assert.equal(formatAverageDelta(8.01, 8), "0");
  assert.equal(formatAverageDelta(null, 8), "n/a");
  assert.equal(formatAverageDelta(8, null), "n/a");
});

test("every breakdown gets its own table, ordered by the current window", () => {
  const body = buildReport(FIXTURE);
  for (const title of [
    "Upgrade by type",
    "Share Completed by option",
    "Push Ticket Result by status",
    "Reengagement Push Suppressed by reason",
    "Fake Door Tapped by feature",
    "Signup Attributed by ref",
    "Image Moderation Result by verdict",
    "Subscription Event by type",
    "Paywall Viewed by trigger",
    "Subscription Event by period type",
    "Subscription Event by cancel reason",
    "Subscription Event by product",
  ]) {
    assert.ok(body.includes(`### ${title}`), `missing ${title}`);
  }
  const [, subscriptions] = body.split("### Subscription Event by type");
  assert.ok(
    subscriptions.indexOf("| RENEWAL |") <
      subscriptions.indexOf("| INITIAL_PURCHASE |"),
  );
  assert.match(body, /\| ai_story_video \| 31 \| 12 \| \+19 \(\+158\.3%\) \|/);
});

test("the pricing tables split the paywall by trigger and the subscription by period", () => {
  const body = buildReport(FIXTURE);
  const [, triggers] = body.split("### Paywall Viewed by trigger");
  assert.match(triggers, /\| like_limit \| 180 \| 150 \| \+30 \(\+20\.0%\) \|/);
  assert.match(triggers, /\| profile_plan \| 90 \| 60 \| \+30 \(\+50\.0%\) \|/);
  assert.ok(
    triggers.indexOf("| like_limit |") < triggers.indexOf("| profile_plan |"),
  );

  const [, periods] = body.split("### Subscription Event by period type");
  assert.match(periods, /\| TRIAL \| 14 \| 9 \| \+5 \(\+55\.6%\) \|/);
  assert.match(periods, /\| NORMAL \| 21 \| 18 \| \+3 \(\+16\.7%\) \|/);
});

test("the cancel reason table separates a refund from a voluntary cancel", () => {
  const body = buildReport(FIXTURE);
  const [, reasons] = body.split("### Subscription Event by cancel reason");
  assert.match(reasons, /\| UNSUBSCRIBE \| 6 \| 4 \| \+2 \(\+50\.0%\) \|/);
  assert.match(reasons, /\| CUSTOMER_SUPPORT \| 2 \| 0 \| \+2 \(new\) \|/);
  assert.match(reasons, /\| BILLING_ERROR \| 1 \| 0 \| \+1 \(new\) \|/);
  // Every subscription event that is not a cancel carries no reason at all.
  assert.match(reasons, /\| unknown \| 28 \| 0 \| \+28 \(new\) \|/);
});

test("the product table separates yearly from monthly and weekly", () => {
  const body = buildReport(FIXTURE);
  const [, products] = body.split("### Subscription Event by product");
  assert.match(products, /\| pegada_yearly \| 18 \| 11 \| \+7 \(\+63\.6%\) \|/);
  assert.match(products, /\| pegada_monthly \| 9 \| 14 \| -5 \(-35\.7%\) \|/);
  assert.match(products, /\| pegada_weekly \| 4 \| 0 \| \+4 \(new\) \|/);
  assert.ok(
    products.indexOf("| pegada_yearly |") <
      products.indexOf("| pegada_monthly |"),
  );
});

test("an empty breakdown says so instead of rendering an empty table", () => {
  const body = buildReport({ ...FIXTURE, breakdowns: {} });
  assert.match(body, /No events in either window\./);
  assert.match(body, /\| Upgrades \(type success\) \| 0 \| 0 \| 0 \|/);
  assert.match(
    body,
    /\| Push Ticket Result ok rate \| n\/a \| n\/a \| n\/a \|/,
  );
});

test("no emoji reaches the comment", () => {
  const body = buildReport(FIXTURE);
  assert.equal(/\p{Extended_Pictographic}/u.test(body), false);
});

test("push attributed returns land in the push table over the people reached", () => {
  const body = buildReport({
    ...FIXTURE,
    totals: [
      ...FIXTURE.totals,
      {
        event: "Reengagement Push Sent",
        people: 640,
        period: "previous",
        total: 900,
      },
    ],
  });
  assert.match(
    body,
    /\| Push attributed returns \(60 min\) \| 200 \| 160 \| \+40 \(\+25\.0%\) \|/,
  );
  // 200 of the 800 reached came back, against 160 of 640 the week before.
  assert.match(
    body,
    /\| Push attributed return rate \| 25\.0% \| 25\.0% \| 0 \|/,
  );
});

test("a window nobody was pushed in reports no rate rather than a division", () => {
  const body = buildReport({
    ...FIXTURE,
    pushReturns: { current: [], previous: [] },
    totals: FIXTURE.totals.filter(
      (row) => row.event !== "Reengagement Push Sent",
    ),
  });
  assert.match(body, /\| Push attributed returns \(60 min\) \| 0 \| 0 \| 0 \|/);
  assert.match(
    body,
    /\| Push attributed return rate \| n\/a \| n\/a \| n\/a \|/,
  );
});

test("the returns row survives a query that answered with no rows at all", () => {
  const body = buildReport({ ...FIXTURE, pushReturns: undefined });
  assert.match(body, /\| Push attributed returns \(60 min\) \| 0 \| 0 \| 0 \|/);
});

test("the coverage note sits under the push table and names the store build", () => {
  const body = buildReport(FIXTURE);
  const note = coverageNote();
  assert.ok(body.includes(note));
  assert.ok(
    body.indexOf(note) > body.indexOf("| Push attributed return rate |"),
  );
  assert.ok(
    body.indexOf(note) < body.indexOf("### Active users by app version"),
  );
});

test("the coverage note lists every event the store build cannot send", () => {
  const note = coverageNote();
  assert.match(note, /store build 1\.6\.2/);
  for (const event of STORE_BUILD_COVERAGE.missingEvents) {
    assert.ok(note.includes(event), `the note should name ${event}`);
  }
});

test("the coverage note does not excuse an event 1.6.2 is really sending", () => {
  const note = coverageNote();
  for (const event of ["Swipe", "Paywall Viewed", "Empty Deck Shown"]) {
    assert.equal(
      note.includes(event),
      false,
      `${event} arrives from 1.6.2, so the note must not blame the build`,
    );
  }
});

test("the coverage note says the update closed the gap on the phones that took it", () => {
  const note = coverageNote();
  assert.match(note, /Push Notification Opened is the exception/);
  assert.match(note, /over the air update of 2026-09-04/);
  assert.match(note, /only the devices that have not/);
  // The gap sentence still comes first: the row is a mix of two populations
  // while the update rolls out, so neither half can be dropped.
  assert.ok(note.indexOf("cannot emit") < note.indexOf("is the exception"));
});

test("the coverage note leaves the exception out when no update has shipped", () => {
  const note = coverageNote({
    missingEvents: ["Share Tapped"],
    version: "1.6.2",
  });
  assert.equal(note.includes("over the air"), false);
  assert.match(note, /cannot emit Share Tapped/);
});

test("the coverage note says so plainly once the store build sends everything", () => {
  const note = coverageNote({ missingEvents: [], version: "1.8.0" });
  assert.match(note, /build 1\.8\.0 emits every event in this readout/);
});

test("the update table says which bundle each runtime is actually running", () => {
  const body = buildReport(FIXTURE);
  assert.ok(body.includes("### OTA updates in use"));
  const [, otaSection] = body.split("### OTA updates in use");
  assert.match(
    otaSection,
    /\| Runtime \| Update \| Launched from \| People \| First seen \|/,
  );
  assert.match(
    otaSection,
    /\| 1\.7\.2 \| a1b2c3d4 \| downloaded \| 780 \| 2026-08-27 04:10 UTC \|/,
  );
  // The row that answers the backport question: people on the store runtime who
  // are no longer launching the bundle that shipped inside the binary.
  assert.match(
    otaSection,
    /\| 1\.6\.2 \| 4b5c6d7e \| downloaded \| 40 \| 2026-09-02 06:45 UTC \|/,
  );
  assert.match(
    otaSection,
    /\| 1\.6\.2 \| 9f8e7d6c \| embedded \| 300 \| 2026-08-26 12:05 UTC \|/,
  );
  assert.ok(body.includes(OTA_SOURCE_NOTE));
});

test("the busiest update leads the table and a device with no timestamp gets a dash", () => {
  const body = buildReport(FIXTURE);
  const [, otaSection] = body.split("### OTA updates in use");
  assert.ok(
    otaSection.indexOf("| 1.7.2 | a1b2c3d4 |") <
      otaSection.indexOf("| 1.6.2 | 9f8e7d6c |"),
  );
  assert.match(otaSection, /\| unknown \| unknown \| unknown \| 12 \| - \|/);
});

test("the update table sits above the city table so the two are not confused", () => {
  const body = buildReport(FIXTURE);
  assert.ok(
    body.indexOf("### OTA updates in use") <
      body.indexOf("### Active users by city"),
  );
});

test("a week with no app events says so instead of rendering an empty update table", () => {
  const body = buildReport({ ...FIXTURE, otaUpdates: [] });
  const [, otaSection] = body.split("### OTA updates in use");
  assert.match(otaSection, /^\n\nNo app events in the last 7 days\./);
});

test("the update table survives a run made before the query existed", () => {
  const body = buildReport({ ...FIXTURE, otaUpdates: undefined });
  assert.ok(body.includes("No app events in the last 7 days."));
});
