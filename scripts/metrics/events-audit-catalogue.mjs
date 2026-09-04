/**
 * The typed catalogue, read as text.
 *
 * `packages/shared/analytics/events.ts` is TypeScript inside a workspace, and
 * the audit runs as plain Node from the repository root with no install step,
 * exactly like the daily readout. So the catalogue is parsed rather than
 * imported: names out of `ANALYTICS_EVENTS`, and the property keys out of the
 * three `*EventProperties` maps, with `key?:` meaning optional and everything
 * else required.
 *
 * Parsing beats hardcoding a second copy of the list. A copy goes stale the
 * first time somebody adds an event, and an audit whose idea of the catalogue
 * is out of date reports the new event as unknown.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Where the catalogue lives, relative to this file. */
export const CATALOGUE_PATH = fileURLToPath(
  new URL("../../packages/shared/analytics/events.ts", import.meta.url),
);

/** The three property maps, and the surface each one describes. */
const PROPERTY_MAPS = [
  { surface: "mobile", type: "MobileEventProperties" },
  { surface: "server", type: "ServerEventProperties" },
  { surface: "web", type: "WebEventProperties" },
];

/** Where the string literal that starts at `start` ends, escapes included. */
function endOfString(source, start) {
  const quoteChar = source[start];
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      index += 2;
    } else if (char === quoteChar) {
      return index + 1;
    } else {
      index += 1;
    }
  }
  return source.length;
}

/**
 * Removes comments so a brace or a colon inside prose cannot be read as code.
 *
 * The catalogue is heavily commented and several of those comments contain
 * both, so stripping them first is what keeps the rest of this file a scanner
 * rather than a parser that has to know what it is looking at. String literals
 * are copied through whole, since the event names live in them.
 */
export function stripComments(source) {
  let output = "";
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' || char === "'" || char === "`") {
      const end = endOfString(source, index);
      output += source.slice(index, end);
      index = end;
    } else if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      index = end === -1 ? source.length : end;
    } else if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 2;
      // A newline in place of the comment, so two declarations separated only
      // by one do not end up glued together on a single line.
      output += "\n";
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

/**
 * The `{ ... }` block that starts at or after `from`, brace balanced.
 *
 * Returns the inside of the block, without the outer braces.
 */
function readBlock(source, from) {
  if (from < 0) {
    return null;
  }
  const start = source.indexOf("{", from);
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start + 1, index);
      }
    }
  }
  return null;
}

/** `CONSTANT` to event name, out of the `ANALYTICS_EVENTS` object. */
function parseEventNames(source) {
  const block = readBlock(source, source.indexOf("ANALYTICS_EVENTS = "));
  if (block === null) {
    throw new Error("The catalogue has no ANALYTICS_EVENTS object");
  }
  const names = new Map();
  for (const match of block.matchAll(/(\w+):\s*"([^"]*)"/g)) {
    names.set(match[1], match[2]);
  }
  if (names.size === 0) {
    throw new Error("The catalogue's ANALYTICS_EVENTS object is empty");
  }
  return names;
}

/**
 * The keys of one object type literal, with whether each one is optional.
 *
 * Only depth one is read: a nested object is the shape of a value, not a
 * property of the event, and counting `from` and `to` inside
 * `Record<string, { from: unknown; to: unknown }>` as event properties would
 * report two keys that never appear in PostHog.
 */
function parseObjectKeys(block) {
  const keys = [];
  let depth = 0;
  let atEntryStart = true;
  for (let index = 0; index < block.length; index += 1) {
    const char = block[index];
    if (char === "{" || char === "(" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === ")" || char === "]") {
      depth -= 1;
    } else if (depth === 0 && (char === ";" || char === ",")) {
      atEntryStart = true;
    } else if (depth === 0 && atEntryStart && /\S/.test(char)) {
      const match = /^(?<key>[A-Za-z_$][\w$]*)(?<optional>\?)?\s*:/.exec(
        block.slice(index),
      );
      if (match) {
        keys.push({
          name: match.groups.key,
          optional: Boolean(match.groups.optional),
        });
      }
      atEntryStart = false;
    }
  }
  return keys;
}

/** Object type aliases in the file, so `LandingAttribution & { ... }` resolves. */
function parseTypeAliases(source) {
  const aliases = new Map();
  for (const match of source.matchAll(/type\s+(\w+)\s*=\s*\{/g)) {
    const block = readBlock(source, match.index + match[0].length - 1);
    if (block !== null) {
      aliases.set(match[1], parseObjectKeys(block));
    }
  }
  return aliases;
}

/**
 * The keys of one event's property type.
 *
 * `undefined` means the event carries no properties of its own. An
 * intersection is walked part by part so the keys an alias contributes count
 * the same as the ones written inline.
 */
function parseValueKeys(value, aliases) {
  const trimmed = value.trim();
  if (trimmed === "undefined" || trimmed === "") {
    return [];
  }

  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of trimmed) {
    if (char === "{" || char === "(" || char === "<") {
      depth += 1;
    } else if (char === "}" || char === ")" || char === ">") {
      depth -= 1;
    }
    if (char === "&" && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);

  const keys = new Map();
  for (const part of parts) {
    const piece = part.trim();
    const contributed = piece.startsWith("{")
      ? parseObjectKeys(readBlock(piece, 0) ?? "")
      : (aliases.get(piece) ?? []);
    for (const key of contributed) {
      keys.set(key.name, key);
    }
  }
  return [...keys.values()];
}

/** `[ANALYTICS_EVENTS.X]: <type>;` entries of one property map. */
function parsePropertyMap(source, typeName, names, aliases) {
  const block = readBlock(source, source.indexOf(`type ${typeName} = `));
  if (block === null) {
    throw new Error(`The catalogue has no ${typeName} map`);
  }
  const entries = new Map();
  let index = 0;
  while (index < block.length) {
    const start = block.indexOf("[ANALYTICS_EVENTS.", index);
    if (start === -1) {
      break;
    }
    const constantEnd = block.indexOf("]", start);
    const constant = block.slice(
      start + "[ANALYTICS_EVENTS.".length,
      constantEnd,
    );
    const colon = block.indexOf(":", constantEnd);
    let depth = 0;
    let end = colon + 1;
    while (end < block.length) {
      const char = block[end];
      if (char === "{" || char === "(" || char === "<") {
        depth += 1;
      } else if (char === "}" || char === ")" || char === ">") {
        depth -= 1;
      } else if (char === ";" && depth === 0) {
        break;
      }
      end += 1;
    }
    const name = names.get(constant);
    if (name) {
      entries.set(name, parseValueKeys(block.slice(colon + 1, end), aliases));
    }
    index = end + 1;
  }
  return entries;
}

/**
 * The whole catalogue: one entry per event name, carrying the surfaces that
 * send it and the property keys each surface types.
 *
 * An event sent from both the app and the API, which "Message Sent" is, gets
 * one entry with both surfaces and the union of the two key lists. Such a key
 * only stays required when every surface that sends the event requires it:
 * `has_text` is required by the app and unknown to the API, so half the rows
 * are supposed to be missing it and calling it required would report a fault
 * that is not there.
 */
export function parseCatalogue(rawSource) {
  const source = stripComments(rawSource);
  const names = parseEventNames(source);
  const aliases = parseTypeAliases(source);

  const events = new Map();
  for (const name of names.values()) {
    events.set(name, { name, perSurface: [], surfaces: [] });
  }

  for (const { surface, type } of PROPERTY_MAPS) {
    const map = parsePropertyMap(source, type, names, aliases);
    for (const [name, keys] of map) {
      const event = events.get(name);
      event.surfaces.push(surface);
      event.perSurface.push(keys);
    }
  }

  return [...events.values()]
    .map((event) => {
      const seen = new Set(
        event.perSurface.flatMap((keys) => keys.map((key) => key.name)),
      );
      const required = [...seen].filter((name) =>
        event.perSurface.every((keys) =>
          keys.some((key) => key.name === name && !key.optional),
        ),
      );
      return {
        name: event.name,
        optionalKeys: [...seen]
          .filter((name) => !required.includes(name))
          .sort(),
        requiredKeys: required.sort(),
        surfaces: event.surfaces,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** The catalogue as it sits on disk right now. */
export function loadCatalogue(path = CATALOGUE_PATH) {
  return parseCatalogue(readFileSync(path, "utf8"));
}
