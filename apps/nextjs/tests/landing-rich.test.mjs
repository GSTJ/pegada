import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * Landing copy keeps a bold phrase or a link inside one translated sentence
 * as an inline tag. `parseRich` is what turns it back into parts, so a tag
 * that does not parse would print its brackets on the page.
 */
const { parseRich } = await import("../src/components/landing/rich.ts");

test("a tag inside a sentence becomes its own part", () => {
  assert.deepEqual(
    parseRich("Vira-lata entra como <b>Sem raça definida</b>."),
    ["Vira-lata entra como ", { tag: "b", text: "Sem raça definida" }, "."],
  );
});

test("several tags, including one at each end", () => {
  assert.deepEqual(
    parseRich("<web>pela web</web>: manda pra <mail>support@pegada.app</mail>"),
    [
      { tag: "web", text: "pela web" },
      ": manda pra ",
      { tag: "mail", text: "support@pegada.app" },
    ],
  );
});

test("text with no tags, or a tag left open, stays as written", () => {
  assert.deepEqual(parseRich("Grátis no iPhone."), ["Grátis no iPhone."]);
  assert.deepEqual(parseRich("a <b>b"), ["a <b>b"]);
  assert.deepEqual(parseRich("<b>a</i>"), ["<b>a</i>"]);
});
