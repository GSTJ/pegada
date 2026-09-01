import { useEffect } from "react";

import { useLocalSearchParams } from "expo-router";

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { setPendingDogProfile } from "@/services/linking/handlers/pending-dog-profile";
import { getData, StorageKeys } from "@/services/storage";

/**
 * Entry point for `pegada://dog/<id>` and `https://www.pegada.app/dog/<id>`.
 * Renders nothing and does not navigate itself -- it only stashes the id for
 * `usePendingDogProfile` (services/linking/index.ts) to push once the app
 * reaches its authenticated home route.
 *
 * Deliberately does NOT `router.replace` anywhere from here. It used to
 * replace to `/`, reasoning that would hand the moment back to the same
 * index/splash route a plain cold launch goes through. That broke the warm
 * case: this screen sits *on top of* the already-mounted app (e.g. the
 * Swipe tab), and root `_layout.tsx`'s auth-redirect effect only reruns when
 * `useSegments()`'s first segment toggles into/out of "(auth)" -- replacing
 * to `/` doesn't trigger that, so nothing ever navigated the user off the
 * splash screen and a `back` from the pushed dog profile stranded them
 * there. Left unhandled, this screen just stays as an inert, invisible
 * frame in the stack: harmless on cold start (the auth-redirect effect
 * that already runs on `_layout` mount replaces it directly), and on a warm
 * link it sits, still invisible, one `back` behind the profile
 * `usePendingDogProfile` pushes on top of it.
 */
/**
 * First step of the shared-link funnel: "Dog Link Opened" ->
 * "Dog Link Sign In Banner Shown" (logged out only) -> "Dog Link Profile
 * Opened". Without this event there is no way to tell a link that never
 * opened the app from one that opened it and lost the user on sign in.
 *
 * `authenticated` is read off the stored token rather than waiting for
 * `getInitialRouteName`'s round trip, so the event fires on the same tick
 * the link lands. An expired token still counts as authenticated here; the
 * funnel's second step is what separates the two in practice.
 */
const trackLinkOpened = async () => {
  const token = await getData(StorageKeys.Token);

  analytics.track({
    event_type: "Dog Link Opened",
    event_properties: { authenticated: Boolean(token) },
  });
};

const DogLink = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    setPendingDogProfile(id);
    trackLinkOpened().catch(sendError);
  }, [id]);

  return null;
};

export default DogLink;
