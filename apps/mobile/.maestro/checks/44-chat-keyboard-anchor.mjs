/**
 * Post-check for flow 44 (chat-keyboard-anchor.yaml).
 *
 * Four phases, two of them transitions this check drives itself:
 *
 *   1. read   — the flow parked the chat freshly opened, keyboard down.
 *   2. focus  — raise the keyboard. The newest row must STILL be readable.
 *               (the at-bottom case: replying must not hide what you are
 *               replying to.)
 *   3. history— dismiss the keyboard, swipe back up the thread, and note the
 *               last row that is readable there.
 *   4. focus  — raise the keyboard again. That same row must still be
 *               readable. (the mid-history case: the reported bug.)
 *
 * "Readable" is a rect entirely between the top of the chat screen and the top
 * of the composer — see lib/chat-geometry.mjs for why `assertVisible` cannot
 * express it.
 *
 * Platform-agnostic: every number comes out of `maestro hierarchy`. Only ever
 * run against iOS so far; Android is pending a device.
 */

import {
  describe,
  driveFragment,
  isReadable,
  lastReadableMessage,
  readChat,
} from "./lib/chat-geometry.mjs";
import { fail, pass } from "./lib/report.mjs";

const TAG = "check-44";
const NEWEST = 40;

/**
 * How far the composer has to travel before we believe the keyboard is up.
 * The IME is at least ~250pt on every device this suite runs on; 100 is far
 * enough above the noise floor to distinguish "keyboard" from "the layout
 * settled by a point or two".
 */
const KEYBOARD_TRAVEL_MIN = 100;

const bandOf = ({ composer, chatScreen, screen }) => ({
  top: chatScreen?.y ?? screen.y ?? 0,
  bottom: composer.y,
});

const snapshot = (label) => {
  const chat = readChat();
  if (!chat.composer) {
    fail(TAG, `${label}: \`chat-input\` is not in the tree`);
  }
  const band = bandOf(chat);
  console.log(
    `[${TAG}] ${label}: composer top ${chat.composer.y}, band ${band.top}..${band.bottom}, rendered ${[
      ...chat.messages.keys(),
    ]
      .sort((a, b) => a - b)
      .join(",")}`,
  );
  return { ...chat, band };
};

// ---------------------------------------------------------------- phase 1
const down = snapshot("keyboard down, at the end");

if (down.messages.size === 0) {
  fail(
    TAG,
    "no `chatux message NN` rows in the tree; run scripts/pre/44-seed-long-chat.sh (the flow wrapper does)",
  );
}

const newestDown = down.messages.get(NEWEST);
if (!newestDown || !isReadable(newestDown, down.band)) {
  fail(
    TAG,
    `precondition: the chat did not open at the newest message (row ${NEWEST} ${describe(
      newestDown,
    )}, band ${down.band.top}..${down.band.bottom}). That is bug #1 — flow 43 owns it — and it makes this check meaningless`,
  );
}

// ---------------------------------------------------------------- phase 2
driveFragment("focus-composer");
const upAtEnd = snapshot("keyboard up, at the end");

const travel = down.composer.y - upAtEnd.composer.y;
if (travel < KEYBOARD_TRAVEL_MIN) {
  fail(
    TAG,
    `the keyboard did not come up: the composer moved ${travel}pt (needs > ${KEYBOARD_TRAVEL_MIN}). Nothing below this would be testing anything`,
  );
}

const newestUp = upAtEnd.messages.get(NEWEST);
if (!newestUp || !isReadable(newestUp, upAtEnd.band)) {
  fail(
    TAG,
    `at-bottom case: raising the keyboard hid the newest message. Row ${NEWEST} was at ${describe(
      newestDown,
    )} with the composer at ${down.composer.y}; it is now at ${describe(
      newestUp,
    )} with the composer at ${upAtEnd.composer.y}`,
  );
}
console.log(
  `[${TAG}] at-bottom OK: row ${NEWEST} clears the composer by ${upAtEnd.composer.y - newestUp.bottom}pt with the keyboard up`,
);

// ---------------------------------------------------------------- phase 3
driveFragment("into-history");
const midDown = snapshot("keyboard down, mid-history");

const anchor = lastReadableMessage(midDown.messages, midDown.band);
if (!anchor) {
  fail(
    TAG,
    "mid-history: no message row is readable at all after scrolling back",
  );
}
if (anchor.n >= NEWEST) {
  fail(
    TAG,
    `mid-history: the swipes did not move off the end (last readable row is still ${anchor.n}). The mid-history case would be a duplicate of the at-bottom one`,
  );
}
console.log(
  `[${TAG}] anchor: row ${anchor.n} at ${describe(anchor.rect)} — the last row readable before focusing`,
);

// ---------------------------------------------------------------- phase 4
driveFragment("focus-composer");
const midUp = snapshot("keyboard up, mid-history");

const midTravel = midDown.composer.y - midUp.composer.y;
if (midTravel < KEYBOARD_TRAVEL_MIN) {
  fail(
    TAG,
    `the keyboard did not come up the second time: the composer moved ${midTravel}pt`,
  );
}

const anchorUp = midUp.messages.get(anchor.n);
if (!anchorUp) {
  fail(
    TAG,
    `mid-history case: row ${anchor.n} was the last row you could read, and raising the keyboard scrolled it out of the rendered window entirely`,
  );
}
if (!isReadable(anchorUp, midUp.band)) {
  fail(
    TAG,
    `mid-history case: raising the keyboard took your place in the thread. Row ${anchor.n} was at ${describe(
      anchor.rect,
    )} above a composer at ${midDown.composer.y}; it is now at ${describe(
      anchorUp,
    )} and the composer is at ${midUp.composer.y}, so it is ${
      anchorUp.bottom - midUp.composer.y
    }pt underneath it`,
  );
}

const shift = anchor.rect.y - anchorUp.y;
pass(
  TAG,
  `the list held its place: row ${anchor.n} shifted up ${shift}pt against ${midTravel}pt of keyboard, and still clears the composer by ${
    midUp.composer.y - anchorUp.bottom
  }pt. At-bottom case held too.`,
);
