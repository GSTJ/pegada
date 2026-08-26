/**
 * Builds `test/fixtures/` from the pristine (pre-migration) sources in git.
 *
 * A fixture is a slice of the real app, not a hand-written sample: the styles
 * module, every file that imports it, and anything it pulls a css`` fragment
 * from — all at their real `src/`-relative paths, so relative specifiers and
 * `@/` aliases keep resolving the way they do in the app.
 *
 *   npx tsx test/generate.ts [git-ref]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixtures = path.join(here, "fixtures");
const ref = process.argv[2] ?? "HEAD";

/** Style modules chosen to cover one behaviour of the transform each. */
const ENTRIES: { name: string; entry: string }[] = [
  { name: "layout-plain", entry: "src/components/layout.ts" },
  { name: "divider-const", entry: "src/components/divider.ts" },
  { name: "text-keystone", entry: "src/components/text.ts" },
  { name: "button-variants", entry: "src/components/Button/styles.ts" },
  { name: "pagination-animated-variants", entry: "src/components/MainCard/components/Pagination/styles.ts" },
  { name: "radio-buttons-if-blocks", entry: "src/components/RadioButtons/styles.ts" },
  { name: "feedback-card-fragment", entry: "src/components/FeedbackCard/styles.ts" },
  { name: "main-card-fragment-source", entry: "src/components/MainCard/styles.ts" },
  { name: "messages-message-attrs", entry: "src/views/(tabs)/Messages/components/Message/styles.ts" },
  { name: "signin-attrs-array", entry: "src/views/(auth)/SignIn/styles.ts" },
  { name: "input-attrs-object", entry: "src/components/Input/styles.ts" },
  { name: "chat-message-two-branches", entry: "src/views/Chat/components/Message/styles.ts" },
  { name: "app-review-self-consumer", entry: "src/services/app-review.tsx" },
  { name: "checkbox-variant-color", entry: "src/views/UpgradeWall/components/Checkbox/styles.ts" },
  { name: "slider-consts", entry: "src/components/Slider/styles.ts" },
  { name: "ask-for-location-stylesheet-clash", entry: "src/views/(auth)/AskForLocation/styles.ts" },
  { name: "glassmorphism-attrs-fn", entry: "src/components/Glassmorphism/styles.ts" },
  { name: "new-match-local-animated", entry: "src/views/NewMatch/styles.ts" },
];

/* ------------------------------------------------------------------------ */

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const tracked = git("ls-tree", "-r", "--name-only", ref, "apps/mobile/src")
  .split("\n")
  .filter((file) => /\.tsx?$/.test(file));

const read = (file: string) => git("show", `${ref}:${file}`);
const sources = new Map(tracked.map((file) => [file, read(file)]));

/** Files whose import specifiers resolve to `target`, by path arithmetic. */
function importersOf(target: string): string[] {
  const found: string[] = [];

  for (const [file, text] of sources) {
    if (file === target) continue;
    for (const specifier of text.matchAll(/from\s+"([^"]+)"/g)) {
      if (resolve(file, specifier[1]!) === target) {
        found.push(file);
        break;
      }
    }
  }

  return found;
}

function resolve(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? path.join("apps/mobile/src", specifier.slice(2))
    : specifier.startsWith(".")
      ? path.join(path.dirname(from), specifier)
      : null;
  if (!base) return null;

  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (sources.has(candidate)) return candidate;
  }
  return null;
}

/** Modules the entry imports that the transform actually reads into. */
function fragmentSources(entry: string): string[] {
  const text = sources.get(entry) ?? "";
  return [...text.matchAll(/from\s+"([^"]+)"/g)]
    .map((match) => resolve(entry, match[1]!))
    .filter((file): file is string => file !== null && /styles\.tsx?$/.test(file));
}

fs.rmSync(fixtures, { recursive: true, force: true });
fs.mkdirSync(fixtures, { recursive: true });

const cases = ENTRIES.map(({ name, entry }) => {
  const full = `apps/mobile/${entry}`;
  if (!sources.has(full)) throw new Error(`no such file at ${ref}: ${full}`);

  // A keystone like `text.ts` has 40+ importers; a handful is enough to pin the
  // behaviour, and `styles.ts` importers come first because those are the ones
  // that wrap it in another `styled()`.
  const importers = importersOf(full)
    .sort((a, b) => Number(b.endsWith("styles.ts")) - Number(a.endsWith("styles.ts")))
    .slice(0, 6);

  const files = new Set([full, ...importers, ...fragmentSources(full)]);

  for (const file of files) {
    const target = path.join(fixtures, name, path.relative("apps/mobile", file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, sources.get(file)!);
  }

  console.log(`${name}: ${files.size} file(s)`);
  return { name, entry };
});

fs.writeFileSync(path.join(fixtures, "cases.json"), `${JSON.stringify(cases, null, 2)}\n`);
console.log(`\n${cases.length} fixtures written`);
