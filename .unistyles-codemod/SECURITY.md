# Isolated codemod dependencies

This private migration tool deliberately installs with npm outside the pnpm
workspace. Keep its source, snapshots, migration ledger and historical git refs.
Root pnpm checks do not audit this package-lock.json.

## minimatch 11 migration

Dependabot alert 567 (GHSA-g3hv-75wg-m249) affects versions below 11.0.1.
The npm override pins the published 11.0.4 release only under @ts-morph/common.
ts-morph 28.0.0 is the latest published release and still requests minimatch ^10.
Its NodeRuntime and BrowserRuntime call the named minimatch(path, pattern)
function without options. This API remains available in v11. The tool does not
consume makeRe, AST, regexp, matchOne, slashSplit or levelTwoFileOptimize,
which v11 removed. Minimatch.set now contains Matcher objects instead of RegExp.
Empty path portions no longer match empty extglobs; globstar/partial matching
also has upstream corrections. No codemod caller migration is needed.

Use Node 20 or >=22 (Node 18 is no longer supported by this transitive dependency).
No app runtime dependency or publishing change is involved.

From this directory, run npm ci, npm run test:history and npm audit.
The history runner executes the complete npm test script against the migration
output at 3cce8b30d6a14759fe78c3cca61b9bc2609b2b64, temporarily overlaying
the ledger inputs and restoring them and the generated reports in finally.
It refuses uncommitted edits to those inputs. Run it alone in the checkout.
Direct npm test compares today's app styles to the original migration and
currently fails on intentional subsequent Slider, SignIn and Swipe UI changes. The parity ledger also
needs the frozen workspace dependencies and historical git objects; install those
with pnpm install --frozen-lockfile from the repository root first. Do not replace
the npm checks with root pnpm checks. test:security exercises the actual ts-morph
consumer's positive and negative globs and runs the upstream amplification cases
in a child bounded to 15 seconds and 512 MiB. It checks both the explicit and
default expansion caps, plus large-set matching semantics.

Sources:
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/isaacs/minimatch/commit/77a0f5c4b80bdc641c3c930a1d9edf5ad2db57f8
- https://github.com/isaacs/minimatch/blob/main/changelog.md
- https://registry.npmjs.org/minimatch/11.0.4
