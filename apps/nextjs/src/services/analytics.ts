import type {
  FeatureInterestStatus,
  WebEventName,
  WebEventProperties,
} from "@pegada/shared/analytics/events";

import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { getPostHog, getWebClient } from "magic-observability/web";

/**
 * Product analytics for the marketing site.
 *
 * Without `NEXT_PUBLIC_POSTHOG_KEY` the shared client is the no-op one, so a
 * call here is a function call and nothing else: no network, no queue, nothing
 * written to the console. Setting that variable on Vercel is the only step
 * needed to start receiving these events.
 *
 * The mobile app is growing its own event catalogue under
 * `packages/shared/analytics`. This name lives here until that lands, and
 * should move into it then so both clients share one source of truth.
 */
export const DOWNLOAD_CTA_CLICKED = "Download CTA Clicked";

/** Which page the button was on. */
export type DownloadCtaPage = "landing" | "dog_share";

/**
 * Where the click sends the visitor. `auto` is the `/store` route handler,
 * which picks a store from the user agent, so the destination is not known at
 * click time.
 */
export type DownloadCtaStore = "app_store" | "play_store" | "auto";

export type DownloadCtaClick = {
  page: DownloadCtaPage;
  /** Where on the page the button sits, e.g. `hero`, `mobile_sticky_bar`. */
  placement: string;
  store: DownloadCtaStore;
  /** Only on `dog_share`: whose profile the visitor arrived through. */
  dogId?: string;
  /**
   * The `?ref=` the visitor arrived with: a user id when the app generated
   * the link, or a hand typed channel token like `ig`. Reported so a click
   * here can be lined up with the "Store Redirect" that follows it and with
   * the install the store eventually attributes.
   *
   * Not named `ref`: React reserves that prop name, and this type is spread
   * onto an anchor. It goes out as `ref`, the same key `/store` sends.
   */
  referral?: string;
};

/**
 * The property bag, split out from the capture so it can be asserted on
 * without a PostHog client. `dog_id` and `ref` are omitted rather than sent
 * as `null` on the landing page: PostHog stores an explicit null and it would
 * show up as a real value in a breakdown.
 */
export const downloadCtaProperties = (click: DownloadCtaClick) => ({
  page: click.page,
  placement: click.placement,
  store: click.store,
  ...(click.dogId === undefined ? {} : { dog_id: click.dogId }),
  ...(click.referral === undefined ? {} : { ref: click.referral }),
});

/**
 * A download click is usually the last thing that happens on the page. On iOS
 * `/store` redirects to the App Store, the store app takes over and the tab is
 * backgrounded within the same tick — early enough that `posthog-js`'s batch
 * timer has not fired and late enough that its `pagehide` flush can be skipped
 * altogether. That window is exactly the click we are here to count.
 *
 * So the event skips the queue and goes out over `sendBeacon`, which the
 * browser is obliged to deliver even after the page is gone. The shared facade
 * takes no per-event options, hence the raw handle, and it is only reached for
 * once the facade reports a live client: `posthog-js` warns when it is called
 * before `init`, which is every click until the key is set.
 */
export const trackDownloadCtaClicked = (click: DownloadCtaClick) => {
  if (!getWebClient().enabled) return;

  getPostHog().capture(DOWNLOAD_CTA_CLICKED, downloadCtaProperties(click), {
    transport: "sendBeacon",
    send_instantly: true,
  });
};

/**
 * How the visitor arrived, read off the query string on the server and handed
 * to the client as props. Camel case here, snake case in PostHog: these are
 * the names the page code uses, and {@link aiStoryProperties} does the
 * translation once.
 */
export type AiStoryAttribution = {
  ref?: string;
  utmCampaign?: string;
  utmMedium?: string;
  utmSource?: string;
};

/** Everything the three AI story events carry, before the event's own fields. */
export type AiStoryContext = AiStoryAttribution & { locale: string };

/**
 * The property bag, split out from the capture so it can be asserted on
 * without a PostHog client.
 *
 * An absent parameter is omitted rather than sent as `null`, for the same
 * reason `dog_id` is above: PostHog stores an explicit null and it shows up as
 * a real value in a breakdown, so every direct visit would form a "null" row
 * next to the campaigns.
 */
export const aiStoryProperties = ({
  locale,
  ref,
  utmCampaign,
  utmMedium,
  utmSource,
}: AiStoryContext) => ({
  locale,
  ...(ref === undefined ? {} : { ref }),
  ...(utmCampaign === undefined ? {} : { utm_campaign: utmCampaign }),
  ...(utmMedium === undefined ? {} : { utm_medium: utmMedium }),
  ...(utmSource === undefined ? {} : { utm_source: utmSource }),
});

/**
 * `posthog-js` warns when it is called before `init`, which is every event
 * until the key is set, so the shared client is asked first.
 */
const captureWeb = <Name extends WebEventName>(
  name: Name,
  properties: WebEventProperties[Name],
) => {
  if (!getWebClient().enabled) return;

  getPostHog().capture(name, properties);
};

/** Denominator of the experiment: one per view of the AI story landing page. */
export const trackAiStoryLandingViewed = (context: AiStoryContext) => {
  captureWeb(
    ANALYTICS_EVENTS.AI_STORY_LANDING_VIEWED,
    aiStoryProperties(context),
  );
};

/** The middle step: asked to see the form, has not typed anything yet. */
export const trackAiStoryLandingCtaClicked = (context: AiStoryContext) => {
  captureWeb(
    ANALYTICS_EVENTS.AI_STORY_LANDING_CTA_CLICKED,
    aiStoryProperties(context),
  );
};

/**
 * The number the whole page exists to produce. `already_listed` is counted
 * too, so a returning visitor is not read as a new signup.
 */
export const trackAiStoryLeadCaptured = ({
  status,
  ...context
}: AiStoryContext & { status: FeatureInterestStatus }) => {
  captureWeb(ANALYTICS_EVENTS.AI_STORY_LEAD_CAPTURED, {
    ...aiStoryProperties(context),
    status,
  });
};
