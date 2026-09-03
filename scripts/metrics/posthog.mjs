/**
 * The PostHog side of the readout: one function that runs a HogQL query and
 * hands back rows as objects.
 *
 * `fetchImpl` is injected rather than reached for globally so the tests can
 * exercise the error paths without a key and without a network.
 */

/**
 * Turns PostHog's `{ columns, results }` pair into plain objects.
 *
 * PostHog returns rows as positional arrays, so reading them by index would
 * silently reshuffle every number the day a column is added to a query.
 */
export function rowsToObjects(payload) {
  const columns = payload?.columns;
  const results = payload?.results;
  if (!Array.isArray(columns) || !Array.isArray(results)) {
    throw new TypeError(
      "PostHog returned a response without columns and results, which means the query did not run",
    );
  }
  return results.map((row) =>
    Object.fromEntries(columns.map((column, index) => [column, row[index]])),
  );
}

/**
 * Runs one HogQL query.
 *
 * Any non 2xx answer, and any 200 that carries an `error`, throws with the
 * query name in the message. A readout that silently reports zeroes because a
 * query broke is worse than no readout at all.
 */
export async function queryHogql({
  apiKey,
  fetchImpl = fetch,
  host,
  name,
  projectId,
  query,
}) {
  if (!apiKey) {
    throw new Error("POSTHOG_PERSONAL_API_KEY is not set");
  }
  if (!projectId) {
    throw new Error("POSTHOG_PROJECT_ID is not set");
  }
  if (!host) {
    throw new Error("POSTHOG_HOST is not set");
  }

  const url = `${host.replace(/\/+$/, "")}/api/projects/${projectId}/query/`;
  const response = await fetchImpl(url, {
    body: JSON.stringify({ name, query: { kind: "HogQLQuery", query } }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `PostHog rejected the query "${name}" with status ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(
      `PostHog answered the query "${name}" with something that is not JSON`,
    );
  }

  if (payload?.error || payload?.detail) {
    throw new Error(
      `PostHog reported an error for the query "${name}": ${payload.error ?? payload.detail}`,
    );
  }

  return rowsToObjects(payload);
}
