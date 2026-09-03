import assert from "node:assert/strict";
import { test } from "node:test";

import { queryHogql, rowsToObjects } from "./posthog.mjs";

function fakeResponse({ body, ok = true, status = 200 }) {
  return {
    ok,
    status,
    text: () =>
      Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  };
}

function recordingFetch(response) {
  const calls = [];
  const impl = (url, init) => {
    calls.push({ init, url });
    return Promise.resolve(fakeResponse(response));
  };
  impl.calls = calls;
  return impl;
}

const OK = {
  body: {
    columns: ["event", "period", "total"],
    results: [
      ["Swipe", "current", 5],
      ["Swipe", "previous", 3],
    ],
  },
};

const CREDENTIALS = {
  apiKey: "phx_test",
  host: "https://us.posthog.com",
  projectId: "66163",
};

test("rows come back keyed by column name, not by position", () => {
  assert.deepEqual(rowsToObjects(OK.body), [
    { event: "Swipe", period: "current", total: 5 },
    { event: "Swipe", period: "previous", total: 3 },
  ]);
});

test("a response without columns is treated as a failed query", () => {
  assert.throws(
    () => rowsToObjects({ results: [] }),
    /without columns and results/,
  );
});

test("the query posts HogQL to the project query endpoint with a bearer key", async () => {
  const fetchImpl = recordingFetch(OK);
  await queryHogql({
    ...CREDENTIALS,
    fetchImpl,
    name: "totals",
    query: "SELECT 1",
  });

  const [call] = fetchImpl.calls;
  assert.equal(call.url, "https://us.posthog.com/api/projects/66163/query/");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.headers.Authorization, "Bearer phx_test");
  assert.deepEqual(JSON.parse(call.init.body), {
    name: "totals",
    query: { kind: "HogQLQuery", query: "SELECT 1" },
  });
});

test("a trailing slash on the host does not double up in the path", async () => {
  const fetchImpl = recordingFetch(OK);
  await queryHogql({
    ...CREDENTIALS,
    fetchImpl,
    host: "https://us.posthog.com/",
    name: "totals",
    query: "SELECT 1",
  });
  assert.equal(
    fetchImpl.calls[0].url,
    "https://us.posthog.com/api/projects/66163/query/",
  );
});

test("a missing key fails before anything is sent", async () => {
  const fetchImpl = recordingFetch(OK);
  await assert.rejects(
    queryHogql({
      ...CREDENTIALS,
      apiKey: "",
      fetchImpl,
      name: "totals",
      query: "SELECT 1",
    }),
    /POSTHOG_PERSONAL_API_KEY is not set/,
  );
  await assert.rejects(
    queryHogql({
      ...CREDENTIALS,
      fetchImpl,
      name: "totals",
      projectId: "",
      query: "SELECT 1",
    }),
    /POSTHOG_PROJECT_ID is not set/,
  );
  await assert.rejects(
    queryHogql({
      ...CREDENTIALS,
      fetchImpl,
      host: "",
      name: "totals",
      query: "SELECT 1",
    }),
    /POSTHOG_HOST is not set/,
  );
  assert.equal(fetchImpl.calls.length, 0);
});

test("a rejected query names itself in the failure", async () => {
  const fetchImpl = recordingFetch({
    body: "no permission",
    ok: false,
    status: 403,
  });
  await assert.rejects(
    queryHogql({
      ...CREDENTIALS,
      fetchImpl,
      name: "event totals",
      query: "SELECT 1",
    }),
    /rejected the query "event totals" with status 403: no permission/,
  );
});

test("an error carried inside a 200 still fails the run", async () => {
  const fetchImpl = recordingFetch({ body: { error: "Unknown table foo" } });
  await assert.rejects(
    queryHogql({
      ...CREDENTIALS,
      fetchImpl,
      name: "breakdown",
      query: "SELECT 1",
    }),
    /error for the query "breakdown": Unknown table foo/,
  );
});

test("a body that is not JSON fails rather than parsing to nothing", async () => {
  const fetchImpl = recordingFetch({ body: "<html>gateway timeout</html>" });
  await assert.rejects(
    queryHogql({
      ...CREDENTIALS,
      fetchImpl,
      name: "totals",
      query: "SELECT 1",
    }),
    /is not JSON/,
  );
});
