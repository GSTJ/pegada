import { isReferralId, isReferralRef } from "@pegada/shared/utils/referral";

export const WEBSITE_URL = "https://www.pegada.app/";
export const APP_STORE_URL =
  "https://apps.apple.com/br/app/pegada/id6450865592";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.pegada";

/** Which of the three destinations `/store` sends a request to. */
export type StoreTarget = "ios" | "android" | "web";

/** What a campaign link can carry into a store. All optional, all untrusted. */
export type StoreCampaign = {
  ref?: string | null;
  dog?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

/**
 * The same sniff the route handler has always done, pulled out so the CTA can
 * run it too. The button needs to name the store it is about to open, and
 * asking the server would mean a round trip before a redirect.
 */
export const storeTargetForUserAgent = (userAgent: string): StoreTarget => {
  if (/iPhone|iPad|iPod|WatchOS/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "web";
};

/**
 * Everything here is dropped unless it survives {@link isReferralRef}. These
 * strings end up in someone else's analytics product and in a URL we hand to
 * a browser, and every one of them arrives from a query string anyone can
 * type. The character set is the guardrail, applied once, on the way in.
 */
const keep = (value: string | null | undefined) =>
  isReferralRef(value) ? value : undefined;

/**
 * `dog` is narrower than `ref`. A referrer can be a hand typed channel token
 * like `ig`, but the dog is always an id this site put on the link itself, so
 * it is held to the id pattern.
 */
const keepDog = (value: string | null | undefined) =>
  isReferralId(value) ? value : undefined;

export const readCampaign = (params: URLSearchParams): StoreCampaign => ({
  ref: keep(params.get("ref")),
  dog: keepDog(params.get("dog")),
  utm_source: keep(params.get("utm_source")),
  utm_medium: keep(params.get("utm_medium")),
  utm_campaign: keep(params.get("utm_campaign")),
});

/** The campaign with every unusable value already dropped. */
const cleanCampaign = (campaign?: StoreCampaign) => {
  const ref = keep(campaign?.ref);
  const dog = keepDog(campaign?.dog);
  const source = keep(campaign?.utm_source);
  const medium = keep(campaign?.utm_medium);
  const name = keep(campaign?.utm_campaign);

  return {
    ref,
    dog,
    source,
    medium,
    name,
    any: Boolean(ref ?? dog ?? source ?? medium ?? name),
  };
};

/**
 * Carry the campaign across the store, which is the one hop in this funnel
 * nobody owns.
 *
 * A tap on a shared dog card, or on the Instagram bio link, leaves our origin,
 * spends a while in the App Store or Play, and comes back as a fresh install
 * with no memory of where it came from. Both stores hand one opaque string
 * through to the installed app, under different names and different rules:
 *
 *   - Apple: `ct` is the campaign token on an App Store link, readable through
 *     App Analytics. `pt` (provider token) would let it show up per-provider;
 *     this project has no provider id, and inventing one would just be a
 *     parameter Apple ignores. One slot, so the referrer takes it and the dog
 *     is not carried at all on iOS.
 *   - Google: `referrer` is a single URL-encoded query string, handed to the
 *     app through the Install Referrer API. It is conventionally utm_*, so the
 *     incoming utm_* values are folded into it, the `ref` rides as
 *     `utm_content` and the shared dog rides as `utm_term`.
 */
export const storeUrlFor = ({
  target,
  campaign,
}: {
  target: StoreTarget;
  campaign?: StoreCampaign;
}): string => {
  const {
    ref,
    dog,
    source,
    medium,
    name,
    any: hasCampaign,
  } = cleanCampaign(campaign);

  if (target === "ios") {
    // Apple takes one token. The referrer is the thing worth knowing; the utm_*
    // values have no separate field to land in.
    if (!ref) return APP_STORE_URL;
    const url = new URL(APP_STORE_URL);
    url.searchParams.set("ct", ref);
    return url.toString();
  }

  if (target === "android") {
    if (!hasCampaign) return PLAY_STORE_URL;

    const referrer = new URLSearchParams();
    referrer.set("utm_source", source ?? "pegada");
    referrer.set("utm_medium", medium ?? "share");
    if (name) referrer.set("utm_campaign", name);
    if (ref) referrer.set("utm_content", ref);
    if (dog) referrer.set("utm_term", dog);

    const url = new URL(PLAY_STORE_URL);
    url.searchParams.set("referrer", referrer.toString());
    return url.toString();
  }

  // Desktop. No install to attribute, but the campaign rides along so the
  // landing page's own store badges can carry it to whichever phone follows.
  if (!hasCampaign) return WEBSITE_URL;

  const url = new URL(WEBSITE_URL);
  if (ref) url.searchParams.set("ref", ref);
  if (source) url.searchParams.set("utm_source", source);
  if (medium) url.searchParams.set("utm_medium", medium);
  if (name) url.searchParams.set("utm_campaign", name);
  return url.toString();
};

/**
 * The desktop fallback, as a path on this site rather than an absolute URL.
 *
 * `/store` is a route handler, so it cannot also render a page. The landing
 * page already shows both store badges, which is exactly the fallback a
 * desktop visitor needs, so the redirect goes there and the campaign rides
 * along in the query for the badges to pick up.
 */
export const landingPathFor = (campaign?: StoreCampaign): string => {
  const absolute = new URL(storeUrlFor({ target: "web", campaign }));
  return `/${absolute.search}`;
};
