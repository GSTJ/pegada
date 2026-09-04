import assert from "node:assert/strict";
import { test } from "node:test";

import {
  loadCatalogue,
  parseCatalogue,
  stripComments,
} from "./events-audit-catalogue.mjs";

/**
 * A miniature catalogue carrying every shape the real one uses: a plain
 * object, an event with no properties, an intersection with a type alias, a
 * nested object value, and one name sent from two surfaces.
 */
const FIXTURE = `
/**
 * A comment with a { brace } and a colon: in it.
 */
export const ANALYTICS_EVENTS = {
  EMPTY_DECK_SHOWN: "Empty Deck Shown",
  LANDING_VIEWED: "Landing Viewed",
  MESSAGE_SENT: "Message Sent",
  PAYWALL_VIEWED: "Paywall Viewed",
  SAVE_PREFERENCES_PRESSED: "Save Preferences Pressed",
  SWIPE: "Swipe",
} as const;

export type LandingAttribution = {
  ref?: string;
  utm_source?: string;
};

export type MobileEventProperties = {
  [ANALYTICS_EVENTS.EMPTY_DECK_SHOWN]: undefined;
  // A trailing note about the trigger: it matters.
  [ANALYTICS_EVENTS.MESSAGE_SENT]: { has_text: boolean; match_id: string };
  [ANALYTICS_EVENTS.PAYWALL_VIEWED]: { trigger: PaywallTrigger };
  [ANALYTICS_EVENTS.SAVE_PREFERENCES_PRESSED]: {
    changes: Record<string, { from: unknown; to: unknown }>;
  };
  [ANALYTICS_EVENTS.SWIPE]: {
    dog_id: string;
    source?: SwipeSource;
    swipe_type: SwipeKind;
  };
};

export type ServerEventProperties = {
  [ANALYTICS_EVENTS.MESSAGE_SENT]: { match_id: string; message_type: "text" };
};

export type WebEventProperties = {
  [ANALYTICS_EVENTS.LANDING_VIEWED]: LandingAttribution & { locale: string };
};
`;

function find(catalogue, name) {
  const event = catalogue.find((candidate) => candidate.name === name);
  assert.ok(event, `${name} is not in the parsed catalogue`);
  return event;
}

test("comments go, string contents stay", () => {
  const stripped = stripComments(`const a = "keep // this"; // drop this`);
  assert.equal(stripped.trim(), `const a = "keep // this";`);
  assert.equal(
    stripComments("a /* b { c: } */ d").replaceAll("\n", ""),
    "a  d",
  );
});

test("every catalogue name becomes an event", () => {
  const catalogue = parseCatalogue(FIXTURE);
  assert.deepEqual(
    catalogue.map((event) => event.name),
    [
      "Empty Deck Shown",
      "Landing Viewed",
      "Message Sent",
      "Paywall Viewed",
      "Save Preferences Pressed",
      "Swipe",
    ],
  );
});

test("optional keys are told apart from required ones", () => {
  const catalogue = parseCatalogue(FIXTURE);
  const swipe = find(catalogue, "Swipe");
  assert.deepEqual(swipe.requiredKeys, ["dog_id", "swipe_type"]);
  assert.deepEqual(swipe.optionalKeys, ["source"]);
  assert.deepEqual(swipe.surfaces, ["mobile"]);
});

test("an event with no properties has no keys", () => {
  const empty = find(parseCatalogue(FIXTURE), "Empty Deck Shown");
  assert.deepEqual(empty.requiredKeys, []);
  assert.deepEqual(empty.optionalKeys, []);
});

test("the keys of a nested value are not keys of the event", () => {
  const preferences = find(parseCatalogue(FIXTURE), "Save Preferences Pressed");
  assert.deepEqual(preferences.requiredKeys, ["changes"]);
  assert.equal(preferences.optionalKeys.includes("from"), false);
});

test("an intersection picks up the keys of the alias it extends", () => {
  const landing = find(parseCatalogue(FIXTURE), "Landing Viewed");
  assert.deepEqual(landing.requiredKeys, ["locale"]);
  assert.deepEqual(landing.optionalKeys, ["ref", "utm_source"]);
  assert.deepEqual(landing.surfaces, ["web"]);
});

test("a key only one surface sends is not required of the other", () => {
  const message = find(parseCatalogue(FIXTURE), "Message Sent");
  assert.deepEqual(message.surfaces, ["mobile", "server"]);
  assert.deepEqual(message.requiredKeys, ["match_id"]);
  assert.deepEqual(message.optionalKeys, ["has_text", "message_type"]);
});

test("a catalogue without the events object is refused", () => {
  assert.throws(
    () => parseCatalogue('export const SOMETHING_ELSE = { A: "b" };'),
    /no ANALYTICS_EVENTS object/,
  );
});

test("the catalogue on disk parses, and the funnel events keep their shape", () => {
  const catalogue = loadCatalogue();
  assert.ok(catalogue.length > 40, "the real catalogue should not be tiny");

  assert.deepEqual(find(catalogue, "Paywall Viewed").requiredKeys, ["trigger"]);
  assert.deepEqual(find(catalogue, "Swipe").requiredKeys, [
    "dog_id",
    "source",
    "swipe_type",
  ]);
  assert.deepEqual(find(catalogue, "New Match").requiredKeys, ["action"]);
  assert.deepEqual(find(catalogue, "Empty Deck Shown").requiredKeys, []);
  assert.deepEqual(find(catalogue, "Create Dog Profile").optionalKeys, [
    "gender",
    "name",
  ]);
  assert.deepEqual(find(catalogue, "Reengagement Push Sent").requiredKeys, [
    "dedupe_key",
    "kind",
  ]);

  for (const event of catalogue) {
    assert.ok(
      event.surfaces.length > 0,
      `${event.name} is in ANALYTICS_EVENTS but in none of the property maps`,
    );
  }
});
