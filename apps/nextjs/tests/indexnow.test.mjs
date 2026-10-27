import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

/**
 * IndexNow only accepts a submission when `/<key>.txt` on the host returns
 * the key. The key lives in `src/lib/indexnow.ts` and is served from
 * `public/`, so the two copies are compared here.
 */
const { INDEXNOW_KEY, indexNowPayload } = await import(
  "../src/lib/indexnow.ts"
);

test("the key is 32 hex characters", () => {
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{32}$/);
});

test("the public key file holds only the key", () => {
  const file = path.join(
    import.meta.dirname,
    "..",
    "public",
    `${INDEXNOW_KEY}.txt`,
  );

  assert.equal(fs.readFileSync(file, "utf8"), INDEXNOW_KEY);
});

test("the payload only carries www.pegada.app URLs", () => {
  const payload = indexNowPayload([
    "https://www.pegada.app/",
    "https://www.pegada.app/pt-br/story",
    "https://example.com/x",
    "http://www.pegada.app/",
  ]);

  assert.deepEqual(payload.urlList, [
    "https://www.pegada.app/",
    "https://www.pegada.app/pt-br/story",
  ]);
  assert.equal(
    payload.keyLocation,
    `https://www.pegada.app/${INDEXNOW_KEY}.txt`,
  );
});
