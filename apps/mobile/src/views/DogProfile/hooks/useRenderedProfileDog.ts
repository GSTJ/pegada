import { useLayoutEffect, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { formatDistance } from "@/components/MainCard/components/Distance";
import {
  getHeroSharedContentFingerprint,
  getHeroStateSnapshot,
  invalidateHeroForContentChange,
  invalidateHeroGeometryForScroll,
  invalidateHeroPhotoSession,
  type HeroState,
} from "@/components/HeroTransition/store";
import { api } from "@/contexts/TRPCProvider";
import { useGetFormattedYears } from "@/services/useGetFormattedYears";
import type { SwipeDog } from "@/store/reducers/dogs/swipe";
import { getIsSwipeActionInFlight } from "@/store/swipeActionFlight";

interface PendingRenderedDog {
  dog: SwipeDog;
  fingerprint: string;
  revision: number;
}

interface UseRenderedProfileDogProps {
  activeHero: HeroState;
  fallbackPendingExit: () => void;
  getForwardRunId: () => number | null;
  heroPhotoSessionToken?: string;
  id: string;
  isFocused: boolean;
  isReturningToTop: () => boolean;
  locale: string;
  swipeActionInFlight: boolean;
  topInset: number;
}

export const useRenderedProfileDog = ({
  activeHero,
  fallbackPendingExit,
  getForwardRunId,
  heroPhotoSessionToken,
  id,
  isFocused,
  isReturningToTop,
  locale,
  swipeActionInFlight,
  topInset,
}: UseRenderedProfileDogProps): SwipeDog => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const windowDimensions = useWindowDimensions();
  const getFormattedYears = useGetFormattedYears();
  const [queryDog] = api.dog.get.useSuspenseQuery({ id }, { refetchOnMount: false });
  const formattedAge = queryDog.birthDate ? (getFormattedYears(queryDog.birthDate) ?? null) : null;
  const formattedDistance =
    queryDog.distance === null || queryDog.distance === undefined
      ? null
      : formatDistance(queryDog.distance, locale);
  const queryFingerprint = getHeroSharedContentFingerprint(queryDog, {
    locale,
    formattedAge,
    formattedDistance,
  });
  const [renderedDog, setRenderedDog] = useState(queryDog);
  const renderedDogRef = useRef(renderedDog);
  const renderedFingerprintRef = useRef(queryFingerprint);
  const pendingDogRef = useRef<PendingRenderedDog | null>(null);
  const nextRevisionRef = useRef(0);
  const geometryFingerprint = JSON.stringify([
    windowDimensions.width,
    windowDimensions.height,
    windowDimensions.scale,
    windowDimensions.fontScale,
    insets.top,
    insets.right,
    insets.bottom,
    insets.left,
    topInset,
  ]);
  const appliedGeometryFingerprintRef = useRef(geometryFingerprint);

  useLayoutEffect(() => {
    if (appliedGeometryFingerprintRef.current === geometryFingerprint) return;
    if (isReturningToTop()) {
      fallbackPendingExit();
      return;
    }
    if (!isFocused || activeHero.phase !== null || swipeActionInFlight) return;

    const heroAtInvalidation = getHeroStateSnapshot();
    if (
      heroAtInvalidation.phase !== null ||
      heroAtInvalidation.runId !== activeHero.runId ||
      getIsSwipeActionInFlight()
    ) {
      return;
    }

    appliedGeometryFingerprintRef.current = geometryFingerprint;
    invalidateHeroGeometryForScroll({
      id,
      photoSessionToken: heroPhotoSessionToken,
      forwardRunId: getForwardRunId(),
    });
    router.setParams({ heroTransition: "0" });
  }, [
    activeHero.phase,
    activeHero.runId,
    fallbackPendingExit,
    geometryFingerprint,
    getForwardRunId,
    heroPhotoSessionToken,
    id,
    isFocused,
    isReturningToTop,
    router,
    swipeActionInFlight,
  ]);

  useLayoutEffect(() => {
    const queryObjectChanged = queryDog !== renderedDogRef.current;
    const sharedContentChanged = queryFingerprint !== renderedFingerprintRef.current;
    if (!queryObjectChanged && !sharedContentChanged) {
      pendingDogRef.current = null;
      return;
    }

    let pending = pendingDogRef.current;
    if (!pending || pending.dog !== queryDog || pending.fingerprint !== queryFingerprint) {
      pending = {
        dog: queryDog,
        fingerprint: queryFingerprint,
        revision: ++nextRevisionRef.current,
      };
      pendingDogRef.current = pending;
    }

    if (!isFocused) return;
    if (isReturningToTop()) {
      if (sharedContentChanged) fallbackPendingExit();
      return;
    }

    const publishPendingDog = () => {
      if (pendingDogRef.current?.revision !== pending.revision) return;
      renderedDogRef.current = pending.dog;
      renderedFingerprintRef.current = pending.fingerprint;
      pendingDogRef.current = null;
      setRenderedDog(pending.dog);
    };

    if (!sharedContentChanged) {
      publishPendingDog();
      return;
    }
    if (activeHero.phase !== null || swipeActionInFlight) return;

    const heroAtInvalidation = getHeroStateSnapshot();
    if (
      pendingDogRef.current?.revision !== pending.revision ||
      heroAtInvalidation.phase !== null ||
      heroAtInvalidation.runId !== activeHero.runId ||
      getIsSwipeActionInFlight()
    ) {
      return;
    }

    if (heroPhotoSessionToken) {
      invalidateHeroPhotoSession({ id, sessionToken: heroPhotoSessionToken });
    } else {
      invalidateHeroForContentChange(id, getForwardRunId());
    }
    router.setParams({ heroTransition: "0" });
    publishPendingDog();
  }, [
    activeHero.phase,
    activeHero.runId,
    fallbackPendingExit,
    getForwardRunId,
    heroPhotoSessionToken,
    id,
    isFocused,
    isReturningToTop,
    queryDog,
    queryFingerprint,
    router,
    swipeActionInFlight,
  ]);

  return renderedDog;
};
