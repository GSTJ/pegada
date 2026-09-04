import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COMMENT_MARKER,
  buildFindings,
  buildReport,
  summarise,
} from "./events-audit-report.mjs";

const WINDOW = {
  end: new Date("2026-09-04T12:00:00.000Z"),
  start: new Date("2026-08-28T12:00:00.000Z"),
};

/**
 * A catalogue small enough to read, holding one event of each kind the report
 * has to treat differently: a client event with a required property, a server
 * event, an event with no properties, and one nobody sent.
 *
 * Exported so the fixtures the tests assert on are the same ones the sample in
 * the pull request was rendered from.
 */
export const CATALOGUE = [
  {
    name: "Create Dog Profile",
    optionalKeys: ["gender", "name"],
    requiredKeys: [],
    surfaces: ["mobile"],
  },
  {
    name: "Empty Deck Shown",
    optionalKeys: [],
    requiredKeys: [],
    surfaces: ["mobile"],
  },
  {
    name: "New Match",
    optionalKeys: [],
    requiredKeys: ["action"],
    surfaces: ["mobile"],
  },
  {
    name: "Paywall Viewed",
    optionalKeys: [],
    requiredKeys: ["trigger"],
    surfaces: ["mobile"],
  },
  {
    name: "Reengagement Push Sent",
    optionalKeys: [],
    requiredKeys: ["dedupe_key", "kind"],
    surfaces: ["server"],
  },
  {
    name: "Share Tapped",
    optionalKeys: [],
    requiredKeys: ["dog_id", "is_own_dog", "source"],
    surfaces: ["mobile"],
  },
  {
    name: "Swipe",
    optionalKeys: [],
    requiredKeys: ["dog_id", "source", "swipe_type"],
    surfaces: ["mobile"],
  },
  {
    name: "Upgrade",
    optionalKeys: ["package", "trial"],
    requiredKeys: ["type"],
    surfaces: ["mobile"],
  },
];

export const TOTALS = [
  {
    anonymous_events: 0,
    distinct_ids: 11,
    event: "Swipe",
    people: 11,
    total: 420,
  },
  {
    anonymous_events: 0,
    distinct_ids: 9,
    event: "$screen",
    people: 9,
    total: 260,
  },
  {
    anonymous_events: 0,
    distinct_ids: 4,
    event: "Reengagement Push Sent",
    people: 4,
    total: 80,
  },
  {
    anonymous_events: 12,
    distinct_ids: 3,
    event: "Paywall Viewed",
    people: 3,
    total: 12,
  },
  {
    anonymous_events: 0,
    distinct_ids: 5,
    event: "New Match",
    people: 5,
    total: 9,
  },
  {
    anonymous_events: 0,
    distinct_ids: 2,
    event: "Empty Deck Shown",
    people: 2,
    total: 6,
  },
  {
    anonymous_events: 0,
    distinct_ids: 2,
    event: "Dog Shared",
    people: 2,
    total: 4,
  },
];

export const SPLITS = [
  {
    app_version: "1.7.2",
    event: "Swipe",
    lib: "posthog-react-native",
    total: 380,
  },
  {
    app_version: "1.6.2",
    event: "Swipe",
    lib: "posthog-react-native",
    total: 40,
  },
  {
    app_version: "1.7.2",
    event: "$screen",
    lib: "posthog-react-native",
    total: 260,
  },
  {
    app_version: "unknown",
    event: "Reengagement Push Sent",
    lib: "posthog-node",
    total: 80,
  },
  {
    app_version: "1.7.2",
    event: "Paywall Viewed",
    lib: "posthog-react-native",
    total: 12,
  },
  {
    app_version: "1.7.2",
    event: "New Match",
    lib: "posthog-react-native",
    total: 9,
  },
  {
    app_version: "1.7.2",
    event: "Empty Deck Shown",
    lib: "posthog-react-native",
    total: 6,
  },
  { app_version: "unknown", event: "Dog Shared", lib: "web", total: 4 },
];

export const PROPERTY_KEYS = [
  { event: "Swipe", key: "$lib", total: 420 },
  { event: "Swipe", key: "dog_id", total: 420 },
  { event: "Swipe", key: "source", total: 380 },
  { event: "Swipe", key: "swipe_type", total: 420 },
  { event: "New Match", key: "$lib", total: 9 },
  { event: "New Match", key: "action", total: 9 },
  { event: "Paywall Viewed", key: "$lib", total: 12 },
  { event: "Paywall Viewed", key: "trigger", total: 12 },
  { event: "Empty Deck Shown", key: "$lib", total: 6 },
  { event: "Reengagement Push Sent", key: "dedupe_key", total: 80 },
  { event: "Reengagement Push Sent", key: "kind", total: 80 },
];

export const FUNNEL_EVENTS = [
  { name: "Paywall Viewed", target: "Paywall Viewed" },
  { name: "Swipe", target: "Swipe" },
  { name: "New Match", target: "New Match" },
  { name: "Create Dog Profile", target: "Create Dog Profile" },
  { name: "Empty Deck Shown", target: "Empty Deck Shown" },
  { name: "Reengagement Push Sent", target: "Reengagement Push Sent" },
];

export const FIXTURE = {
  catalogue: CATALOGUE,
  funnelEvents: FUNNEL_EVENTS,
  generatedAt: new Date("2026-09-04T12:03:00.000Z"),
  propertyKeys: PROPERTY_KEYS,
  splits: SPLITS,
  totals: TOTALS,
  window: WINDOW,
};

function summary() {
  return summarise({
    auditedEvents: FUNNEL_EVENTS.map((entry) => entry.name),
    catalogue: CATALOGUE,
    propertyKeys: PROPERTY_KEYS,
    splits: SPLITS,
    totals: TOTALS,
  });
}

test("events are sorted by volume and matched to the catalogue", () => {
  const result = summary();
  assert.deepEqual(
    result.seen.map((event) => event.name),
    [
      "Swipe",
      "$screen",
      "Reengagement Push Sent",
      "Paywall Viewed",
      "New Match",
      "Empty Deck Shown",
      "Dog Shared",
    ],
  );
  assert.equal(result.seen[0].catalogue.name, "Swipe");
});

test("autocapture is kept apart from names the catalogue simply lacks", () => {
  const result = summary();
  assert.deepEqual(
    result.internal.map((event) => event.name),
    ["$screen"],
  );
  assert.deepEqual(
    result.unknown.map((event) => event.name),
    ["Dog Shared"],
  );
});

test("catalogue events with no rows at all are listed", () => {
  assert.deepEqual(summary().zeroVolume, [
    "Create Dog Profile",
    "Share Tapped",
    "Upgrade",
  ]);
});

test("library counts land in their own bucket and app versions add up", () => {
  const swipe = summary().seen.find((event) => event.name === "Swipe");
  assert.equal(swipe.libs.get("posthog-react-native"), 420);
  assert.equal(swipe.libs.get("posthog-node") ?? 0, 0);
  assert.equal(swipe.versions.get("1.7.2"), 380);
  assert.equal(swipe.versions.get("1.6.2"), 40);
});

test("server events get no app version rows", () => {
  const push = summary().seen.find(
    (event) => event.name === "Reengagement Push Sent",
  );
  assert.equal(push.versions.size, 0);
  assert.equal(push.libs.get("posthog-node"), 80);
});

test("findings name the zero volume events, the unknown ones and the gaps", () => {
  const findings = buildFindings(summary(), FUNNEL_EVENTS);
  assert.ok(
    findings.some(
      (line) =>
        line.includes("3 catalogue events have no volume") &&
        line.includes("`Share Tapped`"),
    ),
  );
  assert.ok(
    findings.some(
      (line) =>
        line.includes("1 event name is not in the catalogue") &&
        line.includes("`Dog Shared`"),
    ),
  );
  assert.ok(
    findings.some(
      (line) =>
        line.includes("`Swipe` is missing required properties") &&
        line.includes("`source` on 9.5%"),
    ),
  );
});

test("an event nobody signed in for is flagged, a server event is not", () => {
  const findings = buildFindings(summary(), FUNNEL_EVENTS);
  assert.ok(
    findings.some((line) =>
      line.includes(
        "`Paywall Viewed` arrived with anonymous distinct ids only",
      ),
    ),
  );
  assert.equal(
    findings.some((line) => line.includes("`Reengagement Push Sent` arrived")),
    false,
  );
});

test("a renamed funnel event is called out by both names", () => {
  const findings = buildFindings(summary(), [
    { name: "Swiped", target: "Swipe" },
  ]);
  assert.ok(
    findings.some((line) => line.includes("`Swipe` is sent as `Swiped`")),
  );
});

test("a clean window says so instead of printing an empty list", () => {
  const findings = buildFindings(
    {
      internal: [],
      seen: [],
      unknown: [],
      zeroVolume: [],
    },
    [],
  );
  assert.deepEqual(findings, ["Nothing to flag in this window."]);
});

test("the body carries the marker and all four sections", () => {
  const body = buildReport(FIXTURE);
  assert.ok(body.startsWith(COMMENT_MARKER));
  assert.match(body, /## Events audit/);
  assert.match(body, /### Findings/);
  assert.match(body, /### 1\. Every event seen/);
  assert.match(body, /### 2\. Catalogue coverage/);
  assert.match(body, /### 3\. Property sanity on the funnel events/);
  assert.match(
    body,
    /Seven days, 2026-08-28 12:00 UTC to 2026-09-04 12:00 UTC/,
  );
});

test("the volume table splits every event by library", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /\| Event \| Catalogue \| Events \| People \| posthog-react-native \| web \| posthog-node \| other \|/,
  );
  assert.match(
    body,
    /\| `Swipe` \| mobile \| 420 \| 11 \| 420 \| 0 \| 0 \| 0 \|/,
  );
  assert.match(
    body,
    /\| `Dog Shared` \| not in catalogue \| 4 \| 2 \| 0 \| 4 \| 0 \| 0 \|/,
  );
  assert.match(body, /\| `\$screen` \| autocapture \| 260 \| 9 \|/);
  assert.match(body, /\| `Swipe` \| `1\.7\.2` \| 380 \|/);
});

test("the property section reports the share missing each required key", () => {
  const body = buildReport(FIXTURE);
  assert.match(
    body,
    /Keys seen: `dog_id`, `source`, `swipe_type`, plus 1 property PostHog adds itself\./,
  );
  assert.match(body, /\| `source` \| 9\.5% \|/);
  assert.match(body, /\| `trigger` \| 0\.0% \|/);
});

test("a funnel event with no rows says so rather than dividing by zero", () => {
  const body = buildReport(FIXTURE);
  assert.match(body, /#### `Create Dog Profile`\n\nNo events in the window\./);
  assert.equal(body.includes("NaN"), false);
  assert.equal(body.includes("Infinity"), false);
});

test("an event the catalogue gives no required properties says that too", () => {
  const body = buildReport(FIXTURE);
  assert.match(body, /The catalogue requires no properties on this event\./);
});

test("the body has no em dashes or en dashes", () => {
  const body = buildReport(FIXTURE);
  assert.equal(body.includes("—"), false);
  assert.equal(body.includes("–"), false);
});

test("an event the property query never covered is not called incomplete", () => {
  // `Share Tapped` has three required keys and no keys read back for it. Only
  // the funnel events are queried, so silence about it is not evidence.
  const findings = buildFindings(
    summarise({
      auditedEvents: [],
      catalogue: CATALOGUE,
      propertyKeys: [],
      splits: SPLITS,
      totals: TOTALS,
    }),
    [],
  );
  assert.equal(
    findings.some((line) => line.includes("is missing required properties")),
    false,
  );
});
