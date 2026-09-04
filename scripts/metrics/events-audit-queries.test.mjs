import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AUDIT_WINDOW_DAYS,
  CLIENT_LIBS,
  EXCEPTION_MESSAGE_LENGTH,
  FUNNEL_TARGETS,
  LIB_BUCKETS,
  MAX_EXCEPTION_GROUPS,
  MAX_ROWS,
  buildAuditWindow,
  buildEventSplitQuery,
  buildEventTotalsQuery,
  buildExceptionGroupsQuery,
  buildPropertyKeysQuery,
  quote,
  resolveFunnelEvents,
} from "./events-audit-queries.mjs";

const NOW = new Date("2026-09-04T12:00:00.000Z");

test("the window is the seven days ending at now", () => {
  const window = buildAuditWindow(NOW);
  assert.equal(AUDIT_WINDOW_DAYS, 7);
  assert.equal(window.end.toISOString(), "2026-09-04T12:00:00.000Z");
  assert.equal(window.start.toISOString(), "2026-08-28T12:00:00.000Z");
});

test("quote escapes what would otherwise end the literal early", () => {
  assert.equal(quote("Paywall Viewed"), "'Paywall Viewed'");
  assert.equal(quote("it's"), String.raw`'it\'s'`);
  assert.equal(quote(String.raw`back\slash`), String.raw`'back\\slash'`);
});

test("the totals query counts every event, not a list of them", () => {
  const query = buildEventTotalsQuery(buildAuditWindow(NOW));
  assert.match(query, /GROUP BY event/);
  assert.equal(query.includes("event IN ("), false);
  assert.match(query, /count\(DISTINCT person_id\) AS people/);
  assert.match(query, /count\(DISTINCT distinct_id\) AS distinct_ids/);
  assert.match(
    query,
    /timestamp >= toDateTime\('2026-08-28 12:00:00', 'UTC'\)/,
  );
  assert.match(query, /timestamp < toDateTime\('2026-09-04 12:00:00', 'UTC'\)/);
});

test("the totals query counts anonymous rows by the shape of the distinct id", () => {
  const query = buildEventTotalsQuery(buildAuditWindow(NOW));
  assert.match(query, /countIf\(match\(distinct_id, '\^\[0-9a-fA-F\]\{8\}/);
  assert.match(query, /AS anonymous_events/);
});

test("the split query breaks down by library and app version at once", () => {
  const query = buildEventSplitQuery(buildAuditWindow(NOW));
  assert.match(query, /properties\.\$lib/);
  assert.match(query, /properties\.\$app_version/);
  assert.match(query, /GROUP BY event, lib, app_version/);
  // Missing and empty collapse into one bucket rather than two.
  assert.match(
    query,
    /ifNull\(nullIf\(toString\(properties\.\$lib\), ''\), 'unknown'\)/,
  );
});

test("the property query asks PostHog which keys the payload had", () => {
  const query = buildPropertyKeysQuery(buildAuditWindow(NOW), [
    "Swipe",
    "New Match",
  ]);
  assert.match(query, /arrayJoin\(JSONExtractKeys\(properties\)\) AS key/);
  assert.match(query, /event IN \('Swipe', 'New Match'\)/);
  assert.match(query, /GROUP BY event, key/);
});

test("the library buckets are the three SDKs, and node is never a client", () => {
  assert.deepEqual(LIB_BUCKETS, [
    "posthog-react-native",
    "web",
    "posthog-node",
  ]);
  assert.equal(CLIENT_LIBS.includes("posthog-node"), false);
});

test("the funnel covers the six events the audit is asked about", () => {
  assert.deepEqual(FUNNEL_TARGETS.map((target) => target.name).sort(), [
    "Create Dog Profile",
    "Empty Deck Shown",
    "New Match",
    "Paywall Viewed",
    "Reengagement Push Sent",
    "Swipe",
  ]);
});

test("the catalogue name wins whenever it has volume", () => {
  const resolved = resolveFunnelEvents(["Swipe", "Swiped", "Paywall Viewed"]);
  const swipe = resolved.find((entry) => entry.target === "Swipe");
  assert.deepEqual(swipe, { name: "Swipe", target: "Swipe" });
});

test("an alias is used only when the catalogue name is silent", () => {
  const resolved = resolveFunnelEvents(["Swiped", "Paywall Shown"]);
  assert.deepEqual(
    resolved.find((entry) => entry.target === "Swipe"),
    { name: "Swiped", target: "Swipe" },
  );
  assert.deepEqual(
    resolved.find((entry) => entry.target === "Paywall Viewed"),
    { name: "Paywall Shown", target: "Paywall Viewed" },
  );
  // Nothing arrived for this one, so it keeps its catalogue name and reports
  // zero rather than disappearing from the readout.
  assert.deepEqual(
    resolved.find((entry) => entry.target === "New Match"),
    { name: "New Match", target: "New Match" },
  );
});

test("every query states its own row limit", () => {
  // PostHog caps an unbounded HogQL query at 100 rows, and a cut answer reads
  // as an event with no properties rather than as an error.
  const window = buildAuditWindow(NOW);
  assert.ok(MAX_ROWS > 1000);
  for (const query of [
    buildEventTotalsQuery(window),
    buildEventSplitQuery(window),
    buildPropertyKeysQuery(window, ["Swipe"]),
  ]) {
    assert.match(query, new RegExp(`LIMIT ${MAX_ROWS}$`));
  }
});

test("the exception query asks for fifteen groups of type and message", () => {
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));
  assert.equal(MAX_EXCEPTION_GROUPS, 15);
  assert.match(query, /AND event = '\$exception'/);
  assert.match(query, /GROUP BY exception_type, message/);
  assert.match(query, /ORDER BY total DESC, exception_type, message/);
  assert.match(query, new RegExp(`LIMIT ${MAX_EXCEPTION_GROUPS}$`));
});

test("the exception query truncates the message before grouping on it", () => {
  // Truncating in the renderer instead would group on the full message, and
  // one fault whose message ends in an id would fill the whole table.
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));
  assert.equal(EXCEPTION_MESSAGE_LENGTH, 120);
  assert.match(
    query,
    new RegExp(`substring\\(.+, 1, ${EXCEPTION_MESSAGE_LENGTH}\\) AS message`),
  );
  assert.equal(query.indexOf("substring(") < query.indexOf("GROUP BY"), true);
});

test("the exception query keeps the libraries and versions inside the group", () => {
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));
  assert.match(query, /groupUniqArray\(.+\$lib.+\) AS libs/);
  assert.match(query, /groupUniqArrayIf\(.+\) AS app_versions/);
  for (const lib of CLIENT_LIBS) {
    assert.ok(query.includes(quote(lib)));
  }
  assert.equal(query.includes("GROUP BY exception_type, message, lib"), false);
});

test("the exception query stays inside its own seven days", () => {
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));
  assert.match(
    query,
    /timestamp >= toDateTime\('2026-08-28 12:00:00', 'UTC'\)/,
  );
  assert.match(query, /timestamp < toDateTime\('2026-09-04 12:00:00', 'UTC'\)/);
});

/**
 * A `$exception` payload the way PostHog stores it once error tracking has
 * been over it: the frames symbolicated into `resolved_name` and `source`,
 * with whatever the SDK originally sent kept under `junk_drawer`.
 *
 * Copied down from a real row on the project. The audit read the flat
 * `$exception_type` and `$exception_message` for its first two runs and
 * reported every crash in the week as one `unknown` group, because neither SDK
 * in this repo writes those two keys.
 */
const RESOLVED_EXCEPTION = JSON.stringify([
  {
    mechanism: { handled: false, synthetic: false, type: "generic" },
    stacktrace: {
      frames: [
        {
          in_app: false,
          lang: "javascript",
          mangled_name: "?",
          module: "promise",
          resolved: true,
          resolved_name: "Promise.all",
          source: "node:internal/promise",
        },
        {
          in_app: true,
          lang: "javascript",
          line: 88,
          mangled_name: "e",
          resolved: true,
          resolved_name: "SwipeScreen",
          source: "app/(app)/index.tsx",
        },
        {
          in_app: true,
          junk_drawer: {
            raw_frame: {
              colno: 12,
              filename: "src/components/DogCard.tsx",
              function: "DogCard",
              lineno: 41,
            },
          },
          lang: "javascript",
          line: 41,
          mangled_name: "?",
          resolved: true,
          resolved_name: "DogCard",
          source: "src/components/DogCard.tsx",
        },
      ],
      type: "resolved",
    },
    type: "TypeError",
    value: "undefined is not an object (evaluating 'dog.photos[0].url')",
  },
]);

/**
 * The same crash the way the SDK builds it, before ingestion touches it.
 *
 * An exception captured by hand never goes through symbolication, so the frame
 * keeps the plain `function` and `filename` the stack parser produced.
 */
const RAW_EXCEPTION = JSON.stringify([
  {
    stacktrace: {
      frames: [
        { filename: "app/_layout.tsx", function: "RootLayout", lineno: 24 },
        {
          filename: "src/components/DogCard.tsx",
          function: "DogCard",
          lineno: 41,
        },
      ],
      type: "raw",
    },
    type: "TypeError",
    value: "undefined is not an object (evaluating 'dog.photos[0].url')",
  },
]);

/** The arguments of one call, split on the commas that are not inside another. */
function splitArguments(text) {
  const parts = [];
  let depth = 0;
  let quoted = false;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      quoted = character !== "'";
    } else if (character === "'") {
      quoted = true;
    } else if (character === "(" || character === "[") {
      depth += 1;
    } else if (character === ")" || character === "]") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

/** ClickHouse indexes an array from one, and from the end when negative. */
function elementAt(array, index) {
  return index < 0 ? array.at(index) : array[index - 1];
}

/**
 * Runs one `JSONExtract` call the way ClickHouse would.
 *
 * Keys walk into objects, numbers index arrays from one, and a negative number
 * counts from the end. `Raw` answers with JSON text so the next call up can
 * read it, `String` answers with the string or nothing, and anything missing
 * is the empty string rather than an error.
 */
function evaluateExtract(expression, payload) {
  const call = /^JSONExtract(?<kind>String|Raw)\((?<rest>.*)\)$/su.exec(
    expression.trim(),
  );
  if (!call) {
    return expression.trim() === "properties.$exception_list"
      ? payload
      : undefined;
  }

  const [source, ...path] = splitArguments(call.groups.rest);
  const json = evaluateExtract(source, payload);
  let value = json === undefined || json === "" ? undefined : JSON.parse(json);
  for (const key of path) {
    if (value === null || value === undefined) {
      break;
    }
    if (key.startsWith("'")) {
      value = Array.isArray(value) ? undefined : value[key.slice(1, -1)];
    } else {
      value = Array.isArray(value) ? elementAt(value, Number(key)) : undefined;
    }
  }
  if (call.groups.kind === "Raw") {
    return value === undefined ? "" : JSON.stringify(value);
  }
  return typeof value === "string" ? value : "";
}

/** The whole call starting at this point in the query, brackets balanced. */
function callAt(query, index) {
  let depth = 0;
  for (let end = index; end < query.length; end += 1) {
    if (query[end] === "(") {
      depth += 1;
    } else if (query[end] === ")") {
      depth -= 1;
      if (depth === 0) {
        return query.slice(index, end + 1);
      }
    }
  }
  return query.slice(index);
}

/** Every string the query pulls out of a payload. */
function readValues(query, payload) {
  const values = new Set();
  for (let index = query.indexOf("JSONExtractString("); index !== -1;) {
    const call = callAt(query, index);
    values.add(evaluateExtract(call, payload));
    index = query.indexOf("JSONExtractString(", index + call.length);
  }
  return values;
}

test("the exception query reads the name and message out of the list", () => {
  // Run against a payload rather than compared as text: a wrong key or a zero
  // based index fails here instead of in production, where it reads as every
  // crash in the window being the same unknown fault.
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));

  for (const payload of [RESOLVED_EXCEPTION, RAW_EXCEPTION]) {
    const values = readValues(query, payload);
    assert.ok(values.has("TypeError"));
    assert.ok(
      values.has("undefined is not an object (evaluating 'dog.photos[0].url')"),
    );
  }
});

test("the exception query takes the frame that threw, not the entry point", () => {
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));

  for (const payload of [RESOLVED_EXCEPTION, RAW_EXCEPTION]) {
    const values = readValues(query, payload);
    assert.ok(values.has("DogCard"));
    assert.ok(values.has("src/components/DogCard.tsx"));
    assert.equal(values.has("RootLayout"), false);
    assert.equal(values.has("Promise.all"), false);
  }
});

test("the exception query still reads the flat properties as a fallback", () => {
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));
  assert.match(query, /properties\.\$exception_type/);
  assert.match(query, /properties\.\$exception_message/);
  assert.match(query, /, 'unknown'\)/);
});

test("the exception query truncates the frame and keeps it out of the group", () => {
  const query = buildExceptionGroupsQuery(buildAuditWindow(NOW));
  assert.match(
    query,
    new RegExp(
      `substring\\(max\\(.+\\), 1, ${EXCEPTION_MESSAGE_LENGTH}\\) AS frame`,
    ),
  );
  assert.equal(
    query.includes("GROUP BY exception_type, message, frame"),
    false,
  );
});
