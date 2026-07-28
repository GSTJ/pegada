/**
 * The site's env boundary. `magic-oxlint-config` only allows `process.env`
 * reads in a file called `env.ts`, and bundlers only substitute
 * `process.env.NEXT_PUBLIC_*` where it is written out literally, so both
 * constraints point at exactly this file.
 *
 * `magic-observability` reads `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_KEY` on its
 * own. The explicit reads here exist for one reason: this project's deployment
 * environments already store the token as `POSTHOG_API_KEY` (that is what
 * `@pegada/api` has always used), and the server half should point at the same
 * project rather than sitting dark until someone adds a second variable.
 */

/** Server-side PostHog token. Undefined means telemetry no-ops, silently. */
export const posthogServerKey = (): string | undefined =>
  process.env.POSTHOG_KEY ??
  process.env.POSTHOG_API_KEY ??
  process.env.NEXT_PUBLIC_POSTHOG_KEY;

export const posthogHost = (): string | undefined =>
  process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;

/**
 * Vercel's deploy environment (`production` / `preview` / `development`) and
 * the commit the bundle was built from, registered as super properties so an
 * exception can be pinned to a deploy.
 */
export const deployEnvironment = (): string =>
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development";

export const deployRelease = (): string | undefined =>
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
