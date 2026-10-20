import type { ReactNode } from "react";

import { createElement, Fragment } from "react";

type RichPart = string | { tag: string; text: string };

/**
 * Splits a translated string around its inline tags, so a sentence with a bold
 * phrase or a link stays one string for the translator:
 * `"a <b>b</b> c"` is `["a ", { tag: "b", text: "b" }, " c"]`. Tags carry no
 * attributes and do not nest; what each one renders as is up to the caller.
 */
export const parseRich = (text: string): RichPart[] => {
  const parts: RichPart[] = [];
  let last = 0;
  for (const match of text.matchAll(/<(\w+)>(.*?)<\/\1>/g)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ tag: match[1] ?? "", text: match[2] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
};

/** A tag with no renderer keeps its text, so a typo in the JSON loses no words. */
export const rich = (
  text: string,
  tags: Record<string, (text: string) => ReactNode>,
) =>
  parseRich(text).map((part, index) =>
    typeof part === "string"
      ? part
      : createElement(
          Fragment,
          { key: index },
          tags[part.tag]?.(part.text) ?? part.text,
        ),
  );
