import { useEffect } from "react";

import { useLocalSearchParams } from "expo-router";

import { setPendingDogProfile } from "@/services/linking/handlers/pending-dog-profile";

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
const DogLink = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    setPendingDogProfile(id);
  }, [id]);

  return null;
};

export default DogLink;
