import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * `src/app` is expo-router's route root. Its `require.context`
 * (expo-router/_ctx.ios.js) matches every `.tsx`/`.ts` under it and excludes
 * only `+api`, `+html` and `+middleware` — nothing filters `.test.` or
 * `.spec.`. So a colocated test file is not inert: it is registered as a
 * route, and the router requires every route module eagerly at startup, in
 * release builds as much as in dev.
 *
 * That is a crash, not a cosmetic warning. A test's top-level
 * `react-dom/server` import resolves to `server.browser.js`, which reads
 * `MessageChannel` — a global Hermes does not have — and the app died with
 * `ReferenceError: Property 'MessageChannel' doesn't exist` before painting
 * its first frame. `jest.mock` at module scope would blow up the same way,
 * with `jest` undefined.
 *
 * Route tests therefore live under `__tests__/app/`, importing their subject
 * through the `@/app/...` alias.
 */
const ROUTER_ROOT = join(__dirname, "..", "..", "src", "app");

const collect = (dir: string, prefix = ""): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? collect(join(dir, entry.name), path) : [path];
  });

test("no test or spec files live inside expo-router's route root", () => {
  const offenders = collect(ROUTER_ROOT).filter((path) =>
    /\.(test|spec)\.[jt]sx?$/.test(path),
  );

  expect(offenders).toStrictEqual([]);
});
