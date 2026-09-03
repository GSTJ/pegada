#!/usr/bin/env node
/**
 * The daily metrics readout.
 *
 * Reads two seven day windows out of PostHog with HogQL and rewrites one
 * comment on the tracking issue with the comparison. Run it locally the same
 * way CI does:
 *
 *   POSTHOG_PERSONAL_API_KEY=phx_... POSTHOG_PROJECT_ID=66163 \
 *     pnpm metrics:daily --dry-run
 *
 * `--dry-run` prints the comment instead of posting it, which is the only mode
 * that does not need a GitHub token. Everything else fails loudly: a missing
 * key, a query PostHog refuses, or a comment GitHub will not accept all exit
 * non zero rather than publishing a table of zeroes.
 */

import { upsertMarkedComment } from "./github.mjs";
import { queryHogql } from "./posthog.mjs";
import {
  BREAKDOWNS,
  buildActiveUsersByVersionQuery,
  buildActiveUsersQuery,
  buildBreakdownQuery,
  buildTotalsQuery,
  buildWindows,
} from "./queries.mjs";
import { COMMENT_MARKER, buildReport } from "./report.mjs";

const DEFAULT_HOST = "https://us.posthog.com";
const DEFAULT_ISSUE = "188";
const DEFAULT_REPO = "GSTJ/pegada";

function requireEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. The readout cannot run without it.`);
  }
  return value;
}

/**
 * Runs every query, renders the comment and either posts it or returns it.
 *
 * `fetchImpl` and `now` are arguments rather than globals so the whole path can
 * be exercised against fixtures.
 */
export async function runDailyMetrics({
  argv = [],
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

  const windows = buildWindows(now);
  const run = (name, query) =>
    queryHogql({ apiKey, fetchImpl, host, name, projectId, query });

  const [activeUsers, activeUsersByVersion, totals, ...breakdownRows] =
    await Promise.all([
      run("pegada daily metrics: active users", buildActiveUsersQuery(windows)),
      run(
        "pegada daily metrics: active users by app version",
        buildActiveUsersByVersionQuery(windows),
      ),
      run("pegada daily metrics: event totals", buildTotalsQuery(windows)),
      ...BREAKDOWNS.map((breakdown) =>
        run(
          `pegada daily metrics: ${breakdown.id}`,
          buildBreakdownQuery(windows, breakdown),
        ),
      ),
    ]);

  const breakdowns = Object.fromEntries(
    BREAKDOWNS.map((breakdown, position) => [
      breakdown.id,
      breakdownRows[position],
    ]),
  );

  const body = buildReport({
    activeUsers,
    activeUsersByVersion,
    breakdowns,
    generatedAt: now,
    totals,
    windows,
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
    const result = await runDailyMetrics({ argv: process.argv.slice(2) });
    process.stdout.write(
      result.action === "printed"
        ? `${result.body}\n`
        : `${result.action} the readout comment: ${result.url}\n`,
    );
  } catch (error) {
    process.stderr.write(`Daily metrics failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
