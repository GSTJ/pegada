import { useEffect } from "react";

import { router, useLocalSearchParams } from "expo-router";

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { setPendingDogProfile } from "@/services/linking/handlers/pending-dog-profile";
import { getData, StorageKeys } from "@/services/storage";

/**
 * Entry point for `pegada://dog/<id>` and `https://www.pegada.app/dog/<id>`
 * (plus the localized `/pt-br/dog/<id>`, which re-exports this screen from
 * app/pt-br/dog/[id].tsx). It renders nothing: the id is stashed for
 * `usePendingDogProfile` (services/linking/index.ts) to push once the app
 * reaches its authenticated home route.
 *
 * Rendering nothing means this route MUST NOT be allowed to stay on top of
 * the stack, or the user is looking at a blank screen with no way out.
 * There are two ways it gets there and they need opposite handling:
 *
 * - Cold start (the link launched the app): this is the only route, and
 *   `router.canGoBack()` is false. Root `_layout.tsx`'s auth-redirect
 *   effect runs on mount and REPLACES it with the resolved initial route,
 *   so nothing is needed here.
 *
 * - Warm link (the app was already running): expo-router PUSHES this route
 *   on top of whatever was on screen, and `_layout.tsx`'s effect does not
 *   re-run -- it keys on `initialRouteName`, which is unchanged (a logged
 *   out user sitting on SignIn resolves to `/sign-in` before and after), so
 *   `router.replace` is never called and the invisible frame stays on top
 *   forever. `back` does not recover it either, because the user is already
 *   at the top of the stack. Popping ourselves is what fixes that: the
 *   screen underneath is exactly where the app was, which is where the
 *   redirect logic already put the user -- SignIn (banner and all) while
 *   logged out, Swipe or wherever they were once authenticated.
 *
 * The pop happens BEFORE `setPendingDogProfile`, because storing the id is
 * what wakes `usePendingDogProfile` up to push the profile: popping after
 * that would pop the profile straight back off.
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
    // `useLocalSearchParams` is typed as if the param is always there, but a
    // malformed link (`pegada://dog/`) and the render before expo-router has
    // parsed the URL both hand back `undefined`. Passing that straight
    // through would clear a pending id that a previous link had just set,
    // and would file a funnel event for a link that names no dog.
    if (!id) return;

    // Warm link: pop this invisible frame off before anything else, so the
    // screen the app was already showing comes back. Cold start has nothing
    // underneath, and `_layout.tsx` replaces this route instead.
    if (router.canGoBack()) router.back();

    setPendingDogProfile(id);
    trackLinkOpened().catch(sendError);
  }, [id]);

  return null;
};

export default DogLink;
