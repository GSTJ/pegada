#!/usr/bin/env node
/**
 * The events audit.
 *
 * Reads seven days out of PostHog, compares what arrived against the typed
 * catalogue in `packages/shared/analytics/events.ts`, and rewrites one comment
 * on the tracking issue with the result. Run it the way CI does:
 *
 *   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=66163 \
 *     pnpm metrics:events-audit --dry-run
 *
 * `--dry-run` prints the body instead of posting it. Everything else fails
 * loudly rather than publishing an audit built on a query that did not run: an
 * audit that under reports is worse than no audit, because it reads as a clean
 * bill of health.
 */

import { loadCatalogue } from "./events-audit-catalogue.mjs";
import {
  buildAuditWindow,
  buildEventSplitQuery,
  buildEventTotalsQuery,
  buildExceptionGroupsQuery,
  buildPropertyKeysQuery,
  resolveFunnelEvents,
} from "./events-audit-queries.mjs";
import { COMMENT_MARKER, buildReport } from "./events-audit-report.mjs";
import { upsertMarkedComment } from "./github.mjs";
import { queryHogql } from "./posthog.mjs";

const DEFAULT_HOST = "https://us.posthog.com";
const DEFAULT_ISSUE = "188";
const DEFAULT_REPO = "GSTJ/pegada";

function requireEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. The audit cannot run without it.`);
  }
  return value;
}

/**
 * Runs the queries, renders the comment, and either posts it or returns it.
 *
 * Two round trips rather than one: the property query can only name the funnel
 * events once the first round has said which names PostHog actually holds, so a
 * renamed event is audited under the name it is really sent under. The
 * exception query depends on nothing, so it goes out with that first round.
 */
export async function runEventsAudit({
  argv = [],
  catalogue = loadCatalogue(),
  env = process.env,
  fetchImpl = fetch,
  now = new Date(),
} = {}) {
  const dryRun = argv.includes("--dry-run");
  const apiKey = requireEnv(env, "POSTHOG_PERSONAL_API_KEY");
  const projectId = requireEnv(env, "POSTHOG_PROJECT_ID");
  const host = env.POSTHOG_HOST?.trim() || DEFAULT_HOST;
  const repo = env.METRICS_REPO?.trim() || DEFAULT_REPO;
  const issue = env.METRICS_ISSUE?.trim() || DEFAULT_ISSUE;

  const window = buildAuditWindow(now);
  const run = (name, query) =>
    queryHogql({ apiKey, fetchImpl, host, name, projectId, query });

  const [totals, splits, exceptions] = await Promise.all([
    run("pegada events audit: event totals", buildEventTotalsQuery(window)),
    run("pegada events audit: event split", buildEventSplitQuery(window)),
    run(
      "pegada events audit: exception groups",
      buildExceptionGroupsQuery(window),
    ),
  ]);

  const funnelEvents = resolveFunnelEvents(totals.map((row) => row.event));
  const funnelNames = [...new Set(funnelEvents.map((entry) => entry.name))];
  const propertyKeys = await run(
    "pegada events audit: funnel property keys",
    buildPropertyKeysQuery(window, funnelNames),
  );

  const body = buildReport({
    catalogue,
    exceptions,
    funnelEvents,
    generatedAt: now,
    propertyKeys,
    splits,
    totals,
    window,
  });

  if (dryRun) {
    return { action: "printed", body };
  }

  const result = await upsertMarkedComment({
    body,
    fetchImpl,
    issue,
    marker: COMMENT_MARKER,
    repo,
    token: env.GITHUB_TOKEN?.trim(),
  });
  return { ...result, body };
}

if (process.argv[1] === import.meta.filename) {
  try {
    const result = await runEventsAudit({ argv: process.argv.slice(2) });
    process.stdout.write(
      result.action === "printed"
        ? `${result.body}\n`
        : `${result.action} the events audit comment: ${result.url}\n`,
    );
  } catch (error) {
    process.stderr.write(`Events audit failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
