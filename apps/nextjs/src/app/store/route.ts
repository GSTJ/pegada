import { redirect } from "next/navigation";

import { getServerClient } from "magic-observability/next";

import {
  deployEnvironment,
  deployRelease,
  posthogHost,
  posthogServerKey,
} from "@/env";

import {
  landingPathFor,
  readCampaign,
  storeTargetForUserAgent,
  storeUrlFor,
} from "./store-urls";

/**
 * The one link that can be printed anywhere: an Instagram bio, a sticker, a
 * reply in a comment thread. It sniffs the user agent and forwards whoever
 * sent the visitor into the store's own campaign parameters, which is the only
 * way an install on the other side of the App Store can be tied back to here.
 *
 * `https://www.pegada.app/store` is the canonical form. The old
 * `share.pegada.app` host has no DNS record behind it (#211), so anything
 * still pointing there is a dead link, not a slower one.
 */
export const GET = (request: Request) => {
  const userAgent = request.headers.get("user-agent") ?? "";
  const target = storeTargetForUserAgent(userAgent);
  const campaign = readCampaign(new URL(request.url).searchParams);

  // Server side because the redirect is the whole response: there is no page
  // for a browser event to fire from, and a bot following the link should not
  // be counted as a person either way. No key means a no-op client, and the
  // shared facade swallows anything the SDK throws, so this cannot turn a
  // dead bio link into a 500.
  getServerClient({
    key: posthogServerKey(),
    host: posthogHost(),
    environment: deployEnvironment(),
    release: deployRelease(),
  }).capture("Store Redirect", {
    store: target,
    ref: campaign.ref ?? null,
    utm_source: campaign.utm_source ?? null,
    utm_medium: campaign.utm_medium ?? null,
    utm_campaign: campaign.utm_campaign ?? null,
  });

  // Desktop has no install to send anyone to. The landing page already shows
  // both store badges, so it is the fallback, with the campaign still attached.
  if (target === "web") {
    return redirect(landingPathFor(campaign));
  }

  return redirect(storeUrlFor({ target, campaign }));
};
