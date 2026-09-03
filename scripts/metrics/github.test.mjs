import assert from "node:assert/strict";
import { test } from "node:test";

import { findMarkedComment, upsertMarkedComment } from "./github.mjs";

const MARKER = "<!-- pegada-daily-metrics -->";
const BASE = {
  issue: "188",
  marker: MARKER,
  repo: "GSTJ/pegada",
  token: "ghs_test",
};

function json(payload) {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(payload)),
  };
}

/** A GitHub that refuses everything, for the failure path. */
function refusingFetch() {
  return Promise.resolve({
    ok: false,
    status: 404,
    text: () => Promise.resolve("Not Found"),
  });
}

/** A fake GitHub that answers from a script of responses and records the calls. */
function fakeGithub(pages) {
  const calls = [];
  const impl = (url, init) => {
    calls.push({
      body: init.body ? JSON.parse(init.body) : undefined,
      method: init.method,
      url,
    });
    if (init.method === "GET") {
      const page = Number(new URL(url).searchParams.get("page"));
      return Promise.resolve(json(pages[page - 1] ?? []));
    }
    return Promise.resolve(
      json({ html_url: "https://github.com/comment", id: 1 }),
    );
  };
  impl.calls = calls;
  return impl;
}

test("the previous readout is found by its marker", async () => {
  const fetchImpl = fakeGithub([
    [
      { body: "unrelated chatter", id: 10 },
      { body: `${MARKER}\n## Daily metrics`, id: 11 },
    ],
  ]);
  const found = await findMarkedComment({ ...BASE, fetchImpl });
  assert.equal(found.id, 11);
});

test("the search keeps paging while pages come back full", async () => {
  const fullPage = Array.from({ length: 100 }, (_, index) => ({
    body: "chatter",
    id: index,
  }));
  const fetchImpl = fakeGithub([
    fullPage,
    [{ body: `${MARKER}\nhi`, id: 900 }],
  ]);
  const found = await findMarkedComment({ ...BASE, fetchImpl });
  assert.equal(found.id, 900);
  assert.equal(fetchImpl.calls.length, 2);
});

test("no marker anywhere returns nothing rather than a wrong comment", async () => {
  const fetchImpl = fakeGithub([[{ body: "chatter", id: 1 }]]);
  assert.equal(await findMarkedComment({ ...BASE, fetchImpl }), null);
});

test("the first run creates the comment", async () => {
  const fetchImpl = fakeGithub([[]]);
  const result = await upsertMarkedComment({
    ...BASE,
    body: "hello",
    fetchImpl,
  });
  assert.equal(result.action, "created");
  const post = fetchImpl.calls.find((call) => call.method === "POST");
  assert.equal(
    post.url,
    "https://api.github.com/repos/GSTJ/pegada/issues/188/comments",
  );
  assert.deepEqual(post.body, { body: "hello" });
});

test("every run after that edits the same comment instead of adding one", async () => {
  const fetchImpl = fakeGithub([[{ body: `${MARKER}\nold`, id: 42 }]]);
  const result = await upsertMarkedComment({ ...BASE, body: "new", fetchImpl });
  assert.equal(result.action, "updated");
  assert.equal(
    fetchImpl.calls.filter((call) => call.method === "POST").length,
    0,
    "a second comment was posted",
  );
  const patch = fetchImpl.calls.find((call) => call.method === "PATCH");
  assert.equal(
    patch.url,
    "https://api.github.com/repos/GSTJ/pegada/issues/comments/42",
  );
  assert.deepEqual(patch.body, { body: "new" });
});

test("a missing token fails before any request", async () => {
  const fetchImpl = fakeGithub([[]]);
  await assert.rejects(
    upsertMarkedComment({ ...BASE, body: "hello", fetchImpl, token: "" }),
    /GITHUB_TOKEN is not set/,
  );
  assert.equal(fetchImpl.calls.length, 0);
});

test("a refused request fails loudly with the status", async () => {
  await assert.rejects(
    upsertMarkedComment({ ...BASE, body: "hello", fetchImpl: refusingFetch }),
    /answered GET .* with 404: Not Found/,
  );
});
