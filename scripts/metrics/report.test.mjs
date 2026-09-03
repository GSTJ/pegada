import assert from "node:assert/strict";
import { test } from "node:test";

import { buildWindows } from "./queries.mjs";
import {
  COMMENT_MARKER,
  buildReport,
  formatDelta,
  formatRateDelta,
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

const FIXTURE = {
  activeUsers: [
    { people: 1240, period: "current" },
    { people: 1100, period: "previous" },
  ],
  activeUsersByVersion: versions([
    ["1.4.0", "current", 900],
    ["1.4.0", "previous", 210],
    ["1.3.2", "current", 320],
    ["1.3.2", "previous", 870],
    ["unknown", "current", 20],
    ["unknown", "previous", 20],
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
  generatedAt: NOW,
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
    ["Reengagement Push Sent", "current", 1000, 800],
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

test("every breakdown gets its own table, ordered by the current window", () => {
  const body = buildReport(FIXTURE);
  for (const title of [
    "Upgrade by type",
    "Share Completed by option",
    "Push Ticket Result by status",
    "Fake Door Tapped by feature",
    "Signup Attributed by ref",
    "Image Moderation Result by verdict",
    "Subscription Event by type",
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
