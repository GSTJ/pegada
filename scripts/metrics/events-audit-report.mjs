/**
 * The audit comment: findings, volume, catalogue coverage, property sanity.
 *
 * Pure, so the whole body can be checked against fixtures without a network.
 * The hidden marker on the first line is what lets a rerun rewrite its own
 * comment instead of leaving a second one on the tracking issue.
 */

import {
  EXCEPTION_MESSAGE_LENGTH,
  LIB_BUCKETS,
  MAX_EXCEPTION_GROUPS,
} from "./events-audit-queries.mjs";

export const COMMENT_MARKER = "<!-- pegada-events-audit -->";

/** Longest table this readout will print before it starts counting the rest. */
const MAX_TABLE_ROWS = 60;

/** The bucket every `$lib` that is not one of the known three falls into. */
const OTHER_LIB = "other";

function number(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function utcStamp(date) {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function percent(part, whole) {
  return whole === 0 ? "n/a" : `${((part / whole) * 100).toFixed(1)}%`;
}

/** A markdown table, or a plain line when there is nothing to put in it. */
function table(headers, rows, empty) {
  if (rows.length === 0) {
    return empty;
  }
  const shown = rows.slice(0, MAX_TABLE_ROWS);
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...shown.map((row) => `| ${row.join(" | ")} |`),
  ];
  if (rows.length > shown.length) {
    lines.push(
      "",
      `${number(rows.length - shown.length)} more rows not shown.`,
    );
  }
  return lines.join("\n");
}

/** Names in a sentence, as inline code, capped so a list cannot run away. */
function nameList(names, limit = 12) {
  const shown = names.slice(0, limit).map((name) => `\`${name}\``);
  const rest = names.length - shown.length;
  return rest > 0
    ? `${shown.join(", ")} and ${number(rest)} more`
    : shown.join(", ");
}

/** `1 event`, `3 events`, so a finding does not read like a template. */
function plural(count, one, many) {
  return `${number(count)} ${count === 1 ? one : many}`;
}

/** PostHog's own events, which nobody in this repo writes. */
function isPosthogInternal(name) {
  return name.startsWith("$");
}

/**
 * Reshapes the three query results into one row per event.
 *
 * Everything downstream reads this, so a column added to a query cannot change
 * what a section prints without passing through here first.
 */
export function summarise({
  auditedEvents = [],
  catalogue,
  propertyKeys,
  splits,
  totals,
}) {
  const byName = new Map();
  const catalogueByName = new Map(
    catalogue.map((event) => [event.name, event]),
  );
  const audited = new Set(auditedEvents);

  for (const row of totals) {
    byName.set(row.event, {
      anonymousEvents: Number(row.anonymous_events ?? 0),
      catalogue: catalogueByName.get(row.event) ?? null,
      distinctIds: Number(row.distinct_ids ?? 0),
      keys: new Map(),
      keysKnown: audited.has(row.event),
      libs: new Map(),
      name: row.event,
      people: Number(row.people ?? 0),
      total: Number(row.total ?? 0),
      versions: new Map(),
    });
  }

  for (const row of splits) {
    const event = byName.get(row.event);
    if (event) {
      const bucket = LIB_BUCKETS.includes(row.lib) ? row.lib : OTHER_LIB;
      const count = Number(row.total ?? 0);
      event.libs.set(bucket, (event.libs.get(bucket) ?? 0) + count);
      if (bucket === "posthog-react-native" || bucket === "web") {
        const version = row.app_version ?? "unknown";
        event.versions.set(version, (event.versions.get(version) ?? 0) + count);
      }
    }
  }

  for (const row of propertyKeys) {
    const event = byName.get(row.event);
    if (event) {
      event.keys.set(row.key, Number(row.total ?? 0));
    }
  }

  const seen = [...byName.values()].sort(
    (left, right) =>
      right.total - left.total || left.name.localeCompare(right.name),
  );

  return {
    internal: seen.filter((event) => isPosthogInternal(event.name)),
    seen,
    unknown: seen.filter(
      (event) => !event.catalogue && !isPosthogInternal(event.name),
    ),
    zeroVolume: catalogue
      .filter((event) => !byName.has(event.name))
      .map((event) => event.name),
  };
}

/**
 * The keys the catalogue requires that some of the events did not carry.
 *
 * One missing row is enough to list the key. The share is reported alongside
 * it, so a handful of rows from an older build reads as the small number it is
 * rather than being hidden by a threshold nobody set on purpose.
 *
 * Only events the property query covered can be judged. Without this an event
 * nobody asked about reads as missing every key it has, because no keys were
 * ever read back for it.
 */
function missingRequired(event) {
  if (!event.keysKnown) {
    return [];
  }
  const required = event.catalogue?.requiredKeys ?? [];
  return required
    .map((key) => {
      const present = event.keys.get(key) ?? 0;
      return { key, missing: event.total - present };
    })
    .filter((row) => row.missing > 0);
}

/**
 * True when every row of the event carries a device id rather than a user id,
 * on an event the catalogue says a person sends.
 *
 * Server events are excluded on purpose: the API captures against whoever the
 * event is about, and that id is a user id by construction.
 */
function anonymousOnly(event) {
  const surfaces = event.catalogue?.surfaces ?? [];
  const expectsUser = surfaces.includes("mobile") || surfaces.includes("web");
  return (
    expectsUser && event.total > 0 && event.anonymousEvents === event.total
  );
}

/** The Findings list, read off the summary rather than written by hand. */
export function buildFindings(summary, funnelEvents) {
  const findings = [];

  if (summary.zeroVolume.length > 0) {
    findings.push(
      `${plural(summary.zeroVolume.length, "catalogue event has", "catalogue events have")} no volume: ${nameList(summary.zeroVolume)}.`,
    );
  }

  if (summary.unknown.length > 0) {
    findings.push(
      `${plural(summary.unknown.length, "event name is", "event names are")} not in the catalogue: ${nameList(summary.unknown.map((event) => event.name))}.`,
    );
  }

  for (const event of summary.seen) {
    const missing = missingRequired(event);
    if (missing.length > 0) {
      findings.push(
        `\`${event.name}\` is missing required properties: ${missing
          .map(
            (row) => `\`${row.key}\` on ${percent(row.missing, event.total)}`,
          )
          .join(", ")}.`,
      );
    }
  }

  for (const event of summary.seen) {
    if (anonymousOnly(event)) {
      findings.push(
        `\`${event.name}\` arrived with anonymous distinct ids only, so ${number(event.total)} events cannot be tied to a signed in user.`,
      );
    }
  }

  for (const entry of funnelEvents) {
    if (entry.name !== entry.target) {
      findings.push(
        `\`${entry.target}\` is sent as \`${entry.name}\`, so anything filtering on the catalogue name reads zero.`,
      );
    }
  }

  return findings.length > 0 ? findings : ["Nothing to flag in this window."];
}

/** What the catalogue says about an event, for the column of the same name. */
function catalogueLabel(event) {
  if (event.catalogue) {
    return event.catalogue.surfaces.join(", ");
  }
  return isPosthogInternal(event.name) ? "autocapture" : "not in catalogue";
}

function volumeSection(summary) {
  const rows = summary.seen.map((event) => [
    `\`${event.name}\``,
    catalogueLabel(event),
    number(event.total),
    number(event.people),
    ...LIB_BUCKETS.map((lib) => number(event.libs.get(lib) ?? 0)),
    number(event.libs.get(OTHER_LIB) ?? 0),
  ]);
  return [
    "### 1. Every event seen",
    "",
    "People are counted per event, so the library columns, which are event counts, do not add up to them.",
    "",
    table(
      ["Event", "Catalogue", "Events", "People", ...LIB_BUCKETS, OTHER_LIB],
      rows,
      "No events at all in the window.",
    ),
  ].join("\n");
}

function versionSection(summary) {
  const rows = summary.seen.flatMap((event) =>
    [...event.versions.entries()]
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .map(([version, count]) => [
        `\`${event.name}\``,
        `\`${version}\``,
        number(count),
      ]),
  );
  return [
    "",
    "Client events by app version. `unknown` is a browser or a build that predates the property.",
    "",
    table(
      ["Event", "App version", "Events"],
      rows,
      "No client events in the window.",
    ),
  ].join("\n");
}

function coverageSection(summary) {
  const unknownRows = summary.unknown.map((event) => [
    `\`${event.name}\``,
    number(event.total),
    number(event.people),
  ]);
  const internalRows = summary.internal.map((event) => [
    `\`${event.name}\``,
    number(event.total),
    number(event.people),
  ]);
  return [
    "### 2. Catalogue coverage",
    "",
    `**Catalogue events with zero volume: ${number(summary.zeroVolume.length)}**`,
    "",
    summary.zeroVolume.length === 0
      ? "Every catalogue event was sent at least once."
      : summary.zeroVolume.map((name) => `- \`${name}\``).join("\n"),
    "",
    `**Seen but not in the catalogue: ${number(summary.unknown.length)}**`,
    "",
    table(
      ["Event", "Events", "People"],
      unknownRows,
      "Nothing arrived under a name the catalogue does not have.",
    ),
    "",
    `**PostHog's own events: ${number(summary.internal.length)}**`,
    "",
    "Autocapture and session events, listed apart because no code in this repo sends them.",
    "",
    table(
      ["Event", "Events", "People"],
      internalRows,
      "No autocapture events in the window.",
    ),
  ].join("\n");
}

/**
 * The keys the event carried, with PostHog's own counted rather than listed.
 *
 * Every event arrives stamped with forty odd `$` properties the SDK adds, and
 * printing them all buries the handful the app actually sent, which are the
 * only ones this audit can say anything about.
 */
function keysLine(ownKeys, stamped) {
  if (ownKeys.length === 0 && stamped === 0) {
    return "No property keys at all, which for an event PostHog stamps with `$lib` means nothing was read back for it.";
  }
  const tail =
    stamped === 0
      ? ""
      : `, plus ${plural(stamped, "property", "properties")} PostHog adds itself`;
  const own =
    ownKeys.length === 0
      ? "None of its own"
      : ownKeys.map((key) => `\`${key}\``).join(", ");
  return `Keys seen: ${own}${tail}.`;
}

function funnelEventSection(entry, summary) {
  const event = summary.seen.find((candidate) => candidate.name === entry.name);
  const heading =
    entry.name === entry.target
      ? `#### \`${entry.name}\``
      : `#### \`${entry.target}\`, sent as \`${entry.name}\``;

  if (!event) {
    return [heading, "", "No events in the window."].join("\n");
  }

  const required = new Set(event.catalogue?.requiredKeys);
  const keys = [...event.keys.keys()].sort();
  const ownKeys = keys.filter((key) => !isPosthogInternal(key));
  const stamped = keys.length - ownKeys.length;
  const requiredRows = [...required].sort().map((key) => {
    const present = event.keys.get(key) ?? 0;
    return [`\`${key}\``, percent(event.total - present, event.total)];
  });

  const identity = anonymousOnly(event)
    ? `Every one of the ${number(event.distinctIds)} distinct ids looks anonymous, and the catalogue has this event coming from a signed in user.`
    : `${percent(event.anonymousEvents, event.total)} of events came from an anonymous distinct id, across ${number(event.distinctIds)} ids.`;

  return [
    heading,
    "",
    `${number(event.total)} events, ${number(event.people)} people.`,
    "",
    keysLine(ownKeys, stamped),
    "",
    table(
      ["Required key", "Share of events missing it"],
      requiredRows,
      "The catalogue requires no properties on this event.",
    ),
    "",
    identity,
  ].join("\n");
}

function propertySection(summary, funnelEvents) {
  return [
    "### 3. Property sanity on the funnel events",
    "",
    "A key counts as present when it is in the payload, even when its value is null.",
    "",
    ...funnelEvents.map((entry) => `${funnelEventSection(entry, summary)}\n`),
  ].join("\n");
}

/**
 * `$lib` in the words the readout uses everywhere else.
 *
 * The raw values are SDK names, and an exception table is read by whoever is
 * about to go and fix it: "mobile" and "server" say which half of the codebase
 * to open, "posthog-node" does not. Anything unmapped is passed through as it
 * arrived rather than swept into a bucket, since a `$lib` nobody recognises on
 * a crash is itself the finding.
 */
const LIB_LABELS = {
  "posthog-node": "server",
  "posthog-react-native": "mobile",
  web: "web",
};

function libLabel(libs) {
  const values = String(libs ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) {
    return "unknown";
  }
  return [...new Set(values.map((value) => LIB_LABELS[value] ?? value))].join(
    ", ",
  );
}

/**
 * Text in a table cell, as a code span that the text cannot break out of.
 *
 * Exception messages arrive with whatever the thrower put in them: pipes, which
 * end a cell, newlines, which end a row, and backticks, which end a code span.
 * The fence grows past the longest run of backticks in the content, which is
 * what CommonMark asks for, and a value that starts or ends with one is padded
 * so the fence is still readable.
 */
export function codeCell(value) {
  const text = String(value ?? "")
    .replaceAll(/\s+/gu, " ")
    .trim();
  if (text === "") {
    return "";
  }
  const escaped = text.replaceAll("|", String.raw`\|`);
  const longest = Math.max(
    0,
    ...[...escaped.matchAll(/`+/gu)].map((match) => match[0].length),
  );
  const fence = "`".repeat(longest + 1);
  const pad = escaped.startsWith("`") || escaped.endsWith("`") ? " " : "";
  return `${fence}${pad}${escaped}${pad}${fence}`;
}

/**
 * The exception table.
 *
 * Last on purpose: everything above it is about whether the instrumentation is
 * telling the truth, and this is the one section about whether the product is
 * working. Grouped by type and message rather than listed one by one, because
 * the number that matters is how many people a single fault reached, and that
 * is the column a fix gets prioritised on.
 */
function exceptionSection(exceptions) {
  const rows = exceptions.map((row) => [
    codeCell(row.exception_type),
    codeCell(row.message),
    codeCell(row.frame) || "n/a",
    number(row.total),
    number(row.people),
    libLabel(row.libs),
    codeCell(row.app_versions) || "n/a",
  ]);
  return [
    "### 5. Exceptions",
    "",
    `The ${number(MAX_EXCEPTION_GROUPS)} busiest \`$exception\` groups in the window, by exception type and message. Messages are cut at ${number(EXCEPTION_MESSAGE_LENGTH)} characters, and the grouping is on the cut value, so two failures that differ only in a trailing id count as one. Frame is the line that threw, on one of the events in the group, and \`n/a\` when the exception arrived without a stack. App version is the build the phone was running, and \`n/a\` on anything the server threw.`,
    "",
    table(
      [
        "Type",
        "Message",
        "Frame",
        "Events",
        "People",
        "Library",
        "App version",
      ],
      rows,
      "No exceptions in the window.",
    ),
  ].join("\n");
}

/** The whole comment body. */
export function buildReport({
  catalogue,
  exceptions = [],
  funnelEvents,
  generatedAt,
  propertyKeys,
  splits,
  totals,
  window,
}) {
  const summary = summarise({
    auditedEvents: funnelEvents.map((entry) => entry.name),
    catalogue,
    propertyKeys,
    splits,
    totals,
  });
  const findings = buildFindings(summary, funnelEvents);

  return [
    COMMENT_MARKER,
    "## Events audit",
    "",
    `Seven days, ${utcStamp(window.start)} to ${utcStamp(window.end)}. Catalogue: ${number(catalogue.length)} events. Generated ${utcStamp(generatedAt)}.`,
    "",
    "### Findings",
    "",
    findings.map((finding) => `- ${finding}`).join("\n"),
    "",
    volumeSection(summary),
    versionSection(summary),
    "",
    coverageSection(summary),
    "",
    propertySection(summary, funnelEvents),
    "",
    exceptionSection(exceptions),
  ].join("\n");
}
