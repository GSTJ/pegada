/**
 * Post-check for flow 43 (chat-opens-at-latest.yaml).
 *
 * The flow leaves a 40-message conversation freshly opened, keyboard down.
 * This asserts the two things that make "it opened at the latest message"
 * true:
 *
 *  1. `chatux message 40` — the newest row — is entirely between the top of
 *     the chat screen and the top of the composer. Not merely present: the
 *     bug's signature is a row that exists in the tree but is painted off the
 *     bottom of the viewport or under the composer.
 *  2. The very first message of the thread is nowhere on screen. Without a
 *     second assertion the check would go green on a fixture short enough to
 *     fit, where landing at the end is not a claim about anything — and row 1
 *     being absent is the statement that actually distinguishes the two ends
 *     of a 40-row conversation.
 *
 * Runs on both platforms: it reads rects out of `maestro hierarchy`, which
 * fills them in the same way on iOS and Android.
 */

import { describe, isReadable, readChat } from "./lib/chat-geometry.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-43";
const NEWEST = 40;

const { composer, chatScreen, messages, screen } = readChat();

if (!composer) {
  fail(TAG, "`chat-input` is not in the tree — flow 43 did not park on a chat");
}
if (messages.size === 0) {
  fail(
    TAG,
    "no `chatux message NN` rows in the tree; run scripts/pre/43-seed-long-chat.sh (the flow wrapper does)",
  );
}

const band = { top: chatScreen?.y ?? screen.y ?? 0, bottom: composer.y };

const newest = messages.get(NEWEST);
if (!newest) {
  fail(
    TAG,
    `the newest row (chatux message ${NEWEST}) is not rendered at all; the list is parked somewhere in the history. Rendered: ${[
      ...messages.keys(),
    ]
      .sort((a, b) => a - b)
      .join(", ")}`,
  );
}

const loaded = [...messages.keys()].sort((a, b) => a - b);
const readable = loaded.filter((n) => isReadable(messages.get(n), band));
const OLDEST = 1;

console.log(
  `[${TAG}] band ${band.top}..${band.bottom}, rendered ${loaded.join(",")}, readable ${readable.join(",")}`,
);
console.log(`[${TAG}] newest row ${describe(newest)}`);

if (!isReadable(newest, band)) {
  fail(
    TAG,
    `the chat did not open at the newest message: row ${NEWEST} is at ${describe(
      newest,
    )} but the readable band is ${band.top}..${band.bottom} (composer top ${composer.y})`,
  );
}

// Not "some rendered row is off screen": FlashList's render window is not the
// loaded page, and a window that happens to land entirely inside the viewport
// made this fail on a chat that was sitting correctly on row 40. Row 1 is the
// honest test — it is the other end of a 40-row thread, and the only way it is
// on screen is if the list never left the start.
if (messages.has(OLDEST)) {
  fail(
    TAG,
    `row ${OLDEST} — the first message of the thread — is rendered at ${describe(
      messages.get(OLDEST),
    )}, so the list is parked at the START of the conversation, not the end`,
  );
}

pass(
  TAG,
  `opened on row ${NEWEST} at ${describe(newest)}, clear of the composer by ${
    composer.y - newest.bottom
  }pt, with the thread's first row nowhere near the screen (rendered ${loaded[0]}..${loaded.at(-1)}, ${readable.length} readable)`,
);
