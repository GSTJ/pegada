/**
 * Where this page sends a phone.
 *
 * Imports nothing on purpose: `apps/nextjs/tests` runs under `node --test`,
 * which resolves ESM the way the runtime does and would need a file extension
 * on any relative import written here.
 */

import type { StoryAttribution } from "./attribution";

/**
 * What every install started on this page is tagged with, all the way through
 * the store and out the other side as `Signup Attributed`.
 *
 * A literal rather than whatever `?ref=` the visitor arrived on: the question
 * the page answers is how many installs it is worth, and that only reads if
 * every one of them carries the same token. The channel is still on the click,
 * in `utm_*`.
 */
export const STORY_REF = "story";

/**
 * `/store` sniffs the user agent and redirects, so one href covers both
 * stores. The utm parameters ride along because that route folds them into
 * Play's install referrer, which is the only place a channel survives the
 * store.
 */
export const storyStoreHref = (attribution: StoryAttribution): string => {
  const query = new URLSearchParams({ ref: STORY_REF });

  if (attribution.utmSource) query.set("utm_source", attribution.utmSource);
  if (attribution.utmMedium) query.set("utm_medium", attribution.utmMedium);
  if (attribution.utmCampaign) {
    query.set("utm_campaign", attribution.utmCampaign);
  }

  return `/store?${query.toString()}`;
};
