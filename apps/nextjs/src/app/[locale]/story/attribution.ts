/**
 * Where a visitor came from, read off the query string.
 *
 * The page is an experiment whose only output is a conversion rate, and a rate
 * is only useful split by channel, so these four values ride along with every
 * event and land on the row. They are visitor input twice over: once in the
 * URL, and again as hidden fields the form posts back, so they are trimmed and
 * capped on both sides of the boundary rather than trusted.
 *
 * Imports nothing on purpose: `apps/nextjs/tests` runs under `node --test`,
 * which resolves ESM the way the runtime does and would need a file extension
 * on any relative import written here.
 */

/**
 * The query string names the page reads, which are also the names the form
 * posts them back under.
 */
export const ATTRIBUTION_PARAMS = {
  ref: "ref",
  utmCampaign: "utm_campaign",
  utmMedium: "utm_medium",
  utmSource: "utm_source",
} as const;

/** Long enough for any real campaign name, short enough to be uninteresting. */
export const MAX_ATTRIBUTION_LENGTH = 200;

export type StoryAttribution = {
  ref?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmSource?: string;
};

/**
 * One parameter, cleaned up. A repeated parameter arrives as an array; the
 * first one wins, because a second is either a mistake or someone playing.
 * Empty is `undefined` rather than `""`, so an empty parameter is the same
 * thing as no parameter everywhere downstream.
 */
export const toAttributionValue = (
  value: string[] | string | undefined,
): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;

  if (typeof first !== "string") return undefined;

  const trimmed = first.trim().slice(0, MAX_ATTRIBUTION_LENGTH);

  return trimmed.length === 0 ? undefined : trimmed;
};

type AttributionSource = Record<string, string[] | string | undefined>;

/** The whole bag, from a page's `searchParams` or from a submitted form. */
export const readAttribution = (
  source: AttributionSource,
): StoryAttribution => ({
  ref: toAttributionValue(source[ATTRIBUTION_PARAMS.ref]),
  utmCampaign: toAttributionValue(source[ATTRIBUTION_PARAMS.utmCampaign]),
  utmMedium: toAttributionValue(source[ATTRIBUTION_PARAMS.utmMedium]),
  utmSource: toAttributionValue(source[ATTRIBUTION_PARAMS.utmSource]),
});
