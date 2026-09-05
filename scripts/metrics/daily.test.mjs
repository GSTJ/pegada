import assert from "node:assert/strict";
import { test } from "node:test";

import { runDailyMetrics } from "./daily.mjs";
import { BREAKDOWNS } from "./queries.mjs";

const NOW = new Date("2026-09-02T12:00:00.000Z");
const ENV = {
  GITHUB_TOKEN: "ghs_test",
  POSTHOG_HOST: "https://us.posthog.com",
  POSTHOG_PERSONAL_API_KEY: "phx_test",
  POSTHOG_PROJECT_ID: "66163",
};

function json(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

/**
 * One fake that answers both services, so the test covers the wiring between
 * them rather than each half in isolation.
 */
/** True only for the PostHog host itself, never for a name that merely ends in it. */
function isPostHog(url) {
  return new URL(url).host === "us.posthog.com";
}

function fakeWorld({ existingComment = null } = {}) {
  const calls = [];
  const impl = (url, init) => {
    calls.push({
      body: init.body ? JSON.parse(init.body) : undefined,
      method: init.method,
      url,
    });

    if (isPostHog(url)) {
      const { name } = JSON.parse(init.body);
      if (name.endsWith("active users")) {
        return json({
          columns: ["period", "people"],
          results: [
            ["current", 1240],
            ["previous", 1100],
          ],
        });
      }
      if (name.endsWith("active users by city")) {
        return json({
          columns: ["bucket", "period", "people"],
          results: [
            ["Sao Paulo", "current", 420],
            ["Sao Paulo", "previous", 400],
            ["unknown", "current", 124],
          ],
        });
      }
      if (name.endsWith("active users by app version")) {
        return json({
          columns: ["bucket", "period", "people"],
          results: [
            ["1.4.0", "current", 900],
            ["1.3.2", "current", 320],
            ["1.4.0", "previous", 210],
          ],
        });
      }
      if (name.includes("push attributed returns")) {
        return json({
          columns: ["people"],
          results: [[name.includes("previous") ? 160 : 200]],
        });
      }
      if (name.endsWith("deck supply")) {
        return json({
          columns: [
            "period",
            "pages",
            "served",
            "requested",
            "primary_count",
            "beyond_radius_count",
            "same_gender_count",
            "recycled_count",
            "short_pages",
          ],
          results: [
            ["current", 100, 840, 1000, 700, 90, 30, 20, 40],
            ["previous", 80, 560, 800, 560, 0, 0, 0, 48],
          ],
        });
      }
      if (name.endsWith("event totals")) {
        return json({
          columns: ["event", "period", "total", "people"],
          results: [
            ["Swipe", "current", 5400, 300],
            ["Swipe", "previous", 5000, 280],
            ["Reengagement Push Sent", "current", 1000, 800],
            ["Reengagement Push Sent", "previous", 900, 640],
            ["Share Tapped", "current", 80, 70],
          ],
        });
      }
      return json({
        columns: ["bucket", "period", "total"],
        results: [
          ["success", "current", 12],
          ["ok", "current", 9],
          ["story", "current", 40],
        ],
      });
    }

    if (init.method === "GET") {
      return json(existingComment ? [existingComment] : []);
    }
    return json({
      html_url: "https://github.com/GSTJ/pegada/issues/188#issuecomment-1",
      id: 1,
    });
  };
  impl.calls = calls;
  return impl;
}

test("a dry run renders the comment and never touches GitHub", async () => {
  const fetchImpl = fakeWorld();
  const result = await runDailyMetrics({
    argv: ["--dry-run"],
    env: { ...ENV, GITHUB_TOKEN: "" },
    fetchImpl,
    now: NOW,
  });

  assert.equal(result.action, "printed");
  assert.match(
    result.body,
    /\| Swipes \| 5,400 \| 5,000 \| \+400 \(\+8\.0%\) \|/,
  );
  assert.match(
    result.body,
    /\| 1\.4\.0 \| 900 \| 210 \| \+690 \(\+328\.6%\) \|/,
  );
  assert.match(
    result.body,
    /\| Sao Paulo \| 420 \| 400 \| \+20 \(\+5\.0%\) \|/,
  );
  assert.match(result.body, /No city: 124 of 1,240 \(10\.0%\)/);
  assert.equal(
    fetchImpl.calls.every((call) => isPostHog(call.url)),
    true,
  );
});

test("one query goes out per metric block", async () => {
  const fetchImpl = fakeWorld();
  await runDailyMetrics({ argv: ["--dry-run"], env: ENV, fetchImpl, now: NOW });
  assert.equal(fetchImpl.calls.length, BREAKDOWNS.length + 7);
});

test("both push return windows are asked for separately and land in the table", async () => {
  const fetchImpl = fakeWorld();
  const result = await runDailyMetrics({
    argv: ["--dry-run"],
    env: ENV,
    fetchImpl,
    now: NOW,
  });

  const names = fetchImpl.calls
    .filter((call) => call.body?.name?.includes("push attributed returns"))
    .map((call) => call.body.name);
  assert.deepEqual(names.sort(), [
    "pegada daily metrics: push attributed returns, last 7 days",
    "pegada daily metrics: push attributed returns, previous 7 days",
  ]);
  assert.match(
    result.body,
    /\| Push attributed returns \(60 min\) \| 200 \| 160 \| \+40 \(\+25\.0%\) \|/,
  );
  assert.match(
    result.body,
    /Coverage note: the store build 1\.6\.2 cannot emit/,
  );
});

test("the deck supply query fills the deck table", async () => {
  const fetchImpl = fakeWorld();
  const result = await runDailyMetrics({
    argv: ["--dry-run"],
    env: ENV,
    fetchImpl,
    now: NOW,
  });

  assert.equal(
    fetchImpl.calls.filter(
      (call) => call.body?.name === "pegada daily metrics: deck supply",
    ).length,
    1,
  );
  const [, deckSection] = result.body.split("### Deck");
  assert.match(
    deckSection,
    /\| Cards served per page \| 8\.4 \| 7\.0 \| \+1\.4 \|/,
  );
  assert.match(
    deckSection,
    /\| Cards from beyond_radius \| 90 \| 0 \| \+90 \(new\) \|/,
  );
  assert.match(
    deckSection,
    /\| Short pages \(served under requested\) \| 40\.0% \| 60\.0% \| -20\.0 pp \|/,
  );
});

test("a full run posts the readout once", async () => {
  const fetchImpl = fakeWorld();
  const result = await runDailyMetrics({ env: ENV, fetchImpl, now: NOW });
  assert.equal(result.action, "created");
  assert.equal(
    fetchImpl.calls.filter((call) => call.url.endsWith("/issues/188/comments"))
      .length,
    1,
  );
});

test("a run that finds yesterday's comment edits it", async () => {
  const fetchImpl = fakeWorld({
    existingComment: { body: "<!-- pegada-daily-metrics -->\nold", id: 77 },
  });
  const result = await runDailyMetrics({ env: ENV, fetchImpl, now: NOW });
  assert.equal(result.action, "updated");
  assert.ok(
    fetchImpl.calls.some(
      (call) =>
        call.method === "PATCH" && call.url.endsWith("/issues/comments/77"),
    ),
  );
});

test("a missing PostHog key stops the run before any query", async () => {
  const fetchImpl = fakeWorld();
  await assert.rejects(
    runDailyMetrics({
      env: { ...ENV, POSTHOG_PERSONAL_API_KEY: "" },
      fetchImpl,
      now: NOW,
    }),
    /POSTHOG_PERSONAL_API_KEY is not set/,
  );
  assert.equal(fetchImpl.calls.length, 0);
});

test("one broken query fails the whole run", async () => {
  const fetchImpl = (url, init) => {
    if (JSON.parse(init.body).name?.endsWith("event totals")) {
      return Promise.resolve({
        ok: false,
        status: 400,
        text: () => Promise.resolve("syntax error"),
      });
    }
    return json({ columns: ["period", "people"], results: [] });
  };
  await assert.rejects(
    runDailyMetrics({ argv: ["--dry-run"], env: ENV, fetchImpl, now: NOW }),
    /rejected the query "pegada daily metrics: event totals" with status 400/,
  );
});
