import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import ts from "typescript";

const coordinatorSource = await readFile(
  new URL("../src/services/matchesWidget/syncCoordinator.ts", import.meta.url),
  "utf8",
);
const { outputText: coordinatorJavaScript } = ts.transpileModule(coordinatorSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const coordinatorModuleUrl = `data:text/javascript;base64,${Buffer.from(coordinatorJavaScript).toString("base64")}`;
const { createWidgetSyncCoordinator } = await import(coordinatorModuleUrl);

const deferred = () => {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

const testDelayedSignedInThenLogout = async () => {
  const coordinator = createWidgetSyncCoordinator();
  const downloadStarted = deferred();
  const releaseDownload = deferred();
  const events = [];
  const generations = [];

  const signedIn = coordinator.enqueueSignedIn(async (lease) => {
    generations.push(lease.generation);
    events.push("signed-in-download");
    downloadStarted.resolve();
    await releaseDownload.promise;

    if (!lease.isLatest()) return;
    events.push("signed-in-sweep");
    if (!lease.isLatest()) return;
    events.push("signed-in-publish");
  });

  await downloadStarted.promise;

  coordinator.beginSignedOutSession();
  const logout = coordinator.enqueueSignedOut(async (lease) => {
    generations.push(lease.generation);
    events.push("logout-clear");
    if (!lease.isLatest()) return;
    events.push("logout-publish");
  });

  releaseDownload.resolve();
  await Promise.all([signedIn, logout]);

  assert.deepEqual(events, ["signed-in-download", "logout-clear", "logout-publish"]);
  assert.deepEqual(generations, [1, 3]);

  await coordinator.enqueueSignedIn(async () => {
    events.push("late-signed-in-publish");
  });
  assert.deepEqual(events, ["signed-in-download", "logout-clear", "logout-publish"]);

  coordinator.beginSignedInSession();
  await coordinator.enqueueSignedIn(async (lease) => {
    generations.push(lease.generation);
    events.push("new-session-publish");
  });
  assert.deepEqual(events, [
    "signed-in-download",
    "logout-clear",
    "logout-publish",
    "new-session-publish",
  ]);
  assert.deepEqual(generations, [1, 3, 4]);
};

const testReopenWithoutFreshSnapshot = async () => {
  const coordinator = createWidgetSyncCoordinator();
  const events = [];

  coordinator.beginSignedOutSession();
  const logout = coordinator.enqueueSignedOut(async () => {
    events.push("logout-clear");
    events.push("logout-publish");
  });

  coordinator.beginSignedInSession();
  await logout;

  assert.deepEqual(events, ["logout-clear", "logout-publish"]);
};

const testCrossSessionCleanupBeforeFreshDownload = async () => {
  const coordinator = createWidgetSyncCoordinator();
  const oldDownloadStarted = deferred();
  const releaseOldDownload = deferred();
  const events = [];
  const generations = [];

  const oldSignedIn = coordinator.enqueueSignedIn(async (lease) => {
    generations.push(lease.generation);
    events.push("old-download");
    oldDownloadStarted.resolve();
    await releaseOldDownload.promise;
    if (lease.isLatest()) events.push("old-publish");
  });

  await oldDownloadStarted.promise;
  coordinator.beginSignedOutSession();
  const logout = coordinator.enqueueSignedOut(async (lease) => {
    generations.push(lease.generation);
    events.push("logout-clear");
    if (lease.isLatest()) events.push("logout-publish");
  });

  coordinator.beginSignedInSession();
  const freshSignedIn = coordinator.enqueueSignedIn(async (lease) => {
    generations.push(lease.generation);
    events.push("fresh-download");
    if (lease.isLatest()) events.push("fresh-publish");
  });

  releaseOldDownload.resolve();
  await Promise.all([oldSignedIn, logout, freshSignedIn]);

  assert.deepEqual(events, [
    "old-download",
    "logout-clear",
    "logout-publish",
    "fresh-download",
    "fresh-publish",
  ]);
  assert.deepEqual(generations, [1, 3, 4]);
};

const testOlderNewerOverlap = async () => {
  const coordinator = createWidgetSyncCoordinator();
  const oldDownloadStarted = deferred();
  const releaseOldDownload = deferred();
  const events = [];
  const generations = [];

  const older = coordinator.enqueueSignedIn(async (lease) => {
    generations.push(lease.generation);
    events.push("older-download");
    oldDownloadStarted.resolve();
    await releaseOldDownload.promise;

    if (!lease.isLatest()) return;
    events.push("older-sweep");
    if (!lease.isLatest()) return;
    events.push("older-publish");
  });

  await oldDownloadStarted.promise;

  const newer = coordinator.enqueueSignedIn(async (lease) => {
    generations.push(lease.generation);
    events.push("newer-download");
    if (!lease.isLatest()) return;
    events.push("newer-sweep");
    if (!lease.isLatest()) return;
    events.push("newer-publish");
  });

  releaseOldDownload.resolve();
  await Promise.all([older, newer]);

  assert.deepEqual(events, ["older-download", "newer-download", "newer-sweep", "newer-publish"]);
  assert.deepEqual(generations, [1, 2]);
};

await testDelayedSignedInThenLogout();
await testReopenWithoutFreshSnapshot();
await testCrossSessionCleanupBeforeFreshDownload();
await testOlderNewerOverlap();

process.stdout.write("widget sync race harness: PASS\n");
