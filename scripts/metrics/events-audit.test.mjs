import assert from "node:assert/strict";
import { test } from "node:test";

import { runEventsAudit } from "./events-audit.mjs";

const NOW = new Date("2026-09-04T12:00:00.000Z");
const ENV = {
  GITHUB_TOKEN: "ghs_test",
  POSTHOG_HOST: "https://us.posthog.com",
  POSTHOG_PERSONAL_API_KEY: "phx_test",
  POSTHOG_PROJECT_ID: "66163",
};

const CATALOGUE = [
  {
    name: "Paywall Viewed",
    optionalKeys: [],
    requiredKeys: ["trigger"],
    surfaces: ["mobile"],
  },
  {
    name: "Swipe",
    optionalKeys: [],
    requiredKeys: ["dog_id", "source", "swipe_type"],
    surfaces: ["mobile"],
  },
];

function json(payload) {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
}

/** True only for the PostHog host itself, never for a name that merely ends in it. */
function isPostHog(url) {
  return new URL(url).host === "us.posthog.com";
}

/**
 * One fake standing in for both services, so the test covers the wiring
 * between them: which name the property query is given is the whole point.
 */
function fakeWorld({ existingComment = null, swipeName = "Swipe" } = {}) {
  const calls = [];
  const impl = (url, init) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ body, method: init.method, url });

    if (isPostHog(url)) {
      if (body.name.endsWith("event totals")) {
        return json({
          columns: [
            "event",
            "total",
            "people",
            "distinct_ids",
            "anonymous_events",
          ],
          results: [
            [swipeName, 420, 11, 11, 0],
            ["Paywall Viewed", 12, 3, 3, 12],
          ],
        });
      }
      if (body.name.endsWith("exception groups")) {
        return json({
          columns: [
            "exception_type",
            "message",
            "frame",
            "total",
            "people",
            "libs",
            "app_versions",
          ],
          results: [
            [
              "TypeError",
              "undefined is not an object",
              "DogCard in src/components/DogCard.tsx",
              6,
              4,
              "posthog-react-native",
              "1.6.2",
            ],
          ],
        });
      }
      if (body.name.endsWith("event split")) {
        return json({
          columns: ["event", "lib", "app_version", "total"],
          results: [
            [swipeName, "posthog-react-native", "1.7.2", 420],
            ["Paywall Viewed", "posthog-react-native", "1.7.2", 12],
          ],
        });
      }
      return json({
        columns: ["event", "key", "total"],
        results: [
          [swipeName, "dog_id", 420],
          [swipeName, "source", 380],
          [swipeName, "swipe_type", 420],
          ["Paywall Viewed", "trigger", 12],
        ],
      });
    }

    if (init.method === "GET") {
      return json(existingComment ? [existingComment] : []);
    }
    return json({
      html_url: "https://github.com/GSTJ/pegada/issues/188#issuecomment-1",
      id: 7,
    });
  };
  impl.calls = calls;
  return impl;
}

test("a dry run prints the body and never touches GitHub", async () => {
  const fetchImpl = fakeWorld();
  const result = await runEventsAudit({
    argv: ["--dry-run"],
    catalogue: CATALOGUE,
    env: ENV,
    fetchImpl,
    now: NOW,
  });

  assert.equal(result.action, "printed");
  assert.match(result.body, /### 1\. Every event seen/);
  assert.match(result.body, /`source` on 9\.5%/);
  assert.match(result.body, /### 5\. Exceptions/);
  assert.match(
    result.body,
    /\| `TypeError` \| `undefined is not an object` \| `DogCard in src\/components\/DogCard\.tsx` \| 6 \| 4 \| mobile \| `1\.6\.2` \|/,
  );
  assert.equal(
    fetchImpl.calls.some((call) => !isPostHog(call.url)),
    false,
  );
});

test("the exception query goes out with the first round", async () => {
  const fetchImpl = fakeWorld();
  await runEventsAudit({
    argv: ["--dry-run"],
    catalogue: CATALOGUE,
    env: ENV,
    fetchImpl,
    now: NOW,
  });

  const exceptionQuery = fetchImpl.calls.find((call) =>
    call.body.name.endsWith("exception groups"),
  ).body.query.query;
  assert.match(exceptionQuery, /AND event = '\$exception'/);
  assert.match(exceptionQuery, /LIMIT 15/);
});

test("the property query only runs once the event names are known", async () => {
  const fetchImpl = fakeWorld();
  await runEventsAudit({
    argv: ["--dry-run"],
    catalogue: CATALOGUE,
    env: ENV,
    fetchImpl,
    now: NOW,
  });

  const queries = fetchImpl.calls.map((call) => call.body.query.query);
  assert.equal(queries.length, 4);
  assert.match(queries[3], /arrayJoin\(JSONExtractKeys\(properties\)\)/);
  assert.match(queries[3], /'Paywall Viewed'/);
  assert.match(queries[3], /'Swipe'/);
});

test("a funnel event sent under another name is audited under that name", async () => {
  const fetchImpl = fakeWorld({ swipeName: "Swiped" });
  const result = await runEventsAudit({
    argv: ["--dry-run"],
    catalogue: CATALOGUE,
    env: ENV,
    fetchImpl,
    now: NOW,
  });

  const propertyQuery = fetchImpl.calls[3].body.query.query;
  assert.match(propertyQuery, /'Swiped'/);
  assert.match(result.body, /`Swipe` is sent as `Swiped`/);
  assert.match(result.body, /#### `Swipe`, sent as `Swiped`/);
});

test("the comment is created the first time and edited after that", async () => {
  const created = await runEventsAudit({
    catalogue: CATALOGUE,
    env: ENV,
    fetchImpl: fakeWorld(),
    now: NOW,
  });
  assert.equal(created.action, "created");

  const updated = await runEventsAudit({
    catalogue: CATALOGUE,
    env: ENV,
    fetchImpl: fakeWorld({
      existingComment: { body: "<!-- pegada-events-audit -->\nold", id: 7 },
    }),
    now: NOW,
  });
  assert.equal(updated.action, "updated");
});

test("a missing key stops the run instead of publishing an empty audit", async () => {
  await assert.rejects(
    runEventsAudit({
      catalogue: CATALOGUE,
      env: { ...ENV, POSTHOG_PERSONAL_API_KEY: "" },
      fetchImpl: fakeWorld(),
      now: NOW,
    }),
    /POSTHOG_PERSONAL_API_KEY is not set/,
  );
});
