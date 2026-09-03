/**
 * One comment on the tracking issue, rewritten in place.
 *
 * The job runs every day, so posting would leave a year of near identical
 * comments behind. It finds the previous one by the hidden marker on its first
 * line and edits that instead.
 */

const API = "https://api.github.com";

async function request(fetchImpl, token, method, url, body) {
  const response = await fetchImpl(url, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "pegada-daily-metrics",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    method,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `GitHub answered ${method} ${url} with ${response.status}: ${text.slice(0, 500)}`,
    );
  }
  return text ? JSON.parse(text) : null;
}

/**
 * Walks the issue comments looking for the marker.
 *
 * Pages rather than reading the first hundred: the tracking issue collects
 * discussion too, and the pinned comment sinks further down every week.
 */
export async function findMarkedComment({
  fetchImpl = fetch,
  issue,
  marker,
  repo,
  token,
}) {
  for (let page = 1; page <= 20; page += 1) {
    // Sequential on purpose: a page is only worth fetching once the one before
    // it came back full, and firing twenty requests at once to find a comment
    // that is usually on page one is a worse trade than the extra round trip.
    // oxlint-disable-next-line no-await-in-loop
    const comments = await request(
      fetchImpl,
      token,
      "GET",
      `${API}/repos/${repo}/issues/${issue}/comments?per_page=100&page=${page}`,
    );
    if (!Array.isArray(comments) || comments.length === 0) {
      return null;
    }
    const match = comments.find((comment) => comment?.body?.includes(marker));
    if (match) {
      return match;
    }
    if (comments.length < 100) {
      return null;
    }
  }
  return null;
}

/** Creates the comment the first time, edits it every time after that. */
export async function upsertMarkedComment({
  body,
  fetchImpl = fetch,
  issue,
  marker,
  repo,
  token,
}) {
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set, so the readout has nowhere to go",
    );
  }
  const existing = await findMarkedComment({
    fetchImpl,
    issue,
    marker,
    repo,
    token,
  });
  if (existing) {
    const updated = await request(
      fetchImpl,
      token,
      "PATCH",
      `${API}/repos/${repo}/issues/comments/${existing.id}`,
      { body },
    );
    return { action: "updated", url: updated?.html_url };
  }
  const created = await request(
    fetchImpl,
    token,
    "POST",
    `${API}/repos/${repo}/issues/${issue}/comments`,
    { body },
  );
  return { action: "created", url: created?.html_url };
}
