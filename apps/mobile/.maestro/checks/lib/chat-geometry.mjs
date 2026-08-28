/**
 * Shared geometry for the two chat checks (43: opens at the newest message,
 * 44: the keyboard does not steal your place in the thread).
 *
 * Both questions are "is this bubble on screen, above the composer", and
 * neither is expressible with `assertVisible`: Maestro asserts an element is
 * in the accessibility tree, not that anything is painted where you can see
 * it. A message row sitting underneath the composer — which is exactly what
 * both bugs look like — is in the tree, with a rect, and passes.
 *
 * The fixture (scripts/pre/lib-seed-long-chat.sh) numbers every message
 * `chatux message NN`, so a row can be identified across two hierarchy reads
 * even though every bubble in the list carries the same testID.
 */

import { execFileSync } from "node:child_process";

import { resolveDevice } from "./device.mjs";
import { readHierarchy } from "./hierarchy.mjs";

const MARKER = /chatux message (\d{2})/;

/**
 * The chat as the checks care about it.
 *
 * `composerTop` is the top edge of the `chat-input` field. It is deliberately
 * not the top of the composer's container (which has no testID): using the
 * field makes the "is this bubble clear of the composer" test slightly
 * stricter than the pixels require, and a check that is strict in the safe
 * direction cannot pass a screen that is actually broken.
 */
export const readChat = ({ device = resolveDevice(), attempts = 3 } = {}) => {
  // Retried, because `maestro hierarchy` sometimes comes back without the
  // screen on it. Seen on a machine running four workflows at once: the flow
  // had just asserted `chat-input` visible and the very next dump had no
  // composer in it at all. Re-reading a second later gets the real tree; the
  // read is free of side effects, so retrying costs a second and nothing else.
  for (let attempt = 1; ; attempt += 1) {
    const chat = readChatOnce(device);
    if (chat.composer || attempt >= attempts) return chat;
    execFileSync("sleep", ["1"]);
  }
};

const readChatOnce = (device) => {
  const { byTestId, nodes, screen } = readHierarchy({ device });

  const composer = byTestId.get("chat-input");
  const chatScreen = byTestId.get("chat-screen");

  /** @type {Map<number, {x:number,y:number,right:number,bottom:number,width:number,height:number}>} */
  const messages = new Map();
  for (const node of nodes) {
    const match = MARKER.exec(node.text ?? "");
    if (match) {
      const n = Number(match[1]);
      // Both the `accessible` bubble and, on some runs, an inner text node
      // carry the same string. Keep the outer (taller) rect: it is the bubble.
      const existing = messages.get(n);
      if (!existing || node.bounds.height > existing.height) {
        messages.set(n, node.bounds);
      }
    }
  }

  return { composer, chatScreen, messages, screen };
};

/** Is `rect` entirely inside the band the user can actually read? */
export const isReadable = (rect, { top, bottom }) =>
  rect.y >= top && rect.bottom <= bottom;

/** The highest-numbered message that is entirely readable, or null. */
export const lastReadableMessage = (messages, band) => {
  let best = null;
  for (const [n, rect] of messages) {
    if (isReadable(rect, band) && (!best || n > best.n)) best = { n, rect };
  }
  return best;
};

export const describe = (rect) =>
  rect ? `[${rect.x},${rect.y}]..[${rect.right},${rect.bottom}]` : "absent";
