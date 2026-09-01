import { capture } from "magic-observability/web";

/**
 * Product analytics for the marketing site.
 *
 * `capture` is `magic-observability`'s browser shorthand. Without
 * `NEXT_PUBLIC_POSTHOG_KEY` the client behind it is the no-op one, so a call
 * here is a function call and nothing else: no network, no queue, nothing
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
};

/**
 * The property bag, split out from the capture so it can be asserted on
 * without a PostHog client. `dog_id` is omitted rather than sent as `null`
 * on the landing page: PostHog stores an explicit null and it would show up
 * as a real value in a breakdown.
 */
export const downloadCtaProperties = (click: DownloadCtaClick) => ({
  page: click.page,
  placement: click.placement,
  store: click.store,
  ...(click.dogId === undefined ? {} : { dog_id: click.dogId }),
});

export const trackDownloadCtaClicked = (click: DownloadCtaClick) => {
  capture(DOWNLOAD_CTA_CLICKED, downloadCtaProperties(click));
};
