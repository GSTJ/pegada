import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  scrollTo,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useScrollViewOffset,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useNavigation, useRouter } from "expo-router";

import {
  endHeroPhotoSession,
  getHeroStateSnapshot,
  startReverseHero,
} from "@/components/HeroTransition/store";
import { getIsSwipeActionInFlight } from "@/store/swipeActionFlight";
import {
  createProfileExitCoordinator,
  getProfileReturnDuration,
  type ExitRequestResult,
  type ProfileExitCallbacks,
} from "@/views/DogProfile/exitCoordinator";

const RETURN_WATCHDOG_GRACE_MS = 250;
const RETURN_MAX_DURATION_MS = 220;
const RETURN_RETRY_MAX_DURATION_MS = 160;

interface UseProfileExitControllerProps {
  activeHeroVersion: number;
  allowAndroidRemovalRef: MutableRefObject<boolean>;
  deferReverseRemoval: (removeRoute: () => void) => void;
  hasExactRouteHeroOwnership: () => boolean;
  heroPhotoSessionToken?: string;
  heroProgress: SharedValue<number>;
  holdsCompletedReverseScene: boolean;
  id: string;
  isFocused: boolean;
  isUnmatchBlockingIntent: (intent: unknown) => boolean;
  isUnmatchOwnedOrPending: () => boolean;
  reduceMotion: boolean;
  releaseRouteHeroOwnership: () => void;
  sceneSettled: boolean;
  screenReaderEnabled: boolean;
  swipeActionInFlight: boolean;
  unmatchLoading: boolean;
  usesHeroScene: boolean;
}

export const useProfileExitController = ({
  activeHeroVersion,
  allowAndroidRemovalRef,
  deferReverseRemoval,
  hasExactRouteHeroOwnership,
  heroPhotoSessionToken,
  heroProgress,
  holdsCompletedReverseScene,
  id,
  isFocused,
  isUnmatchBlockingIntent,
  isUnmatchOwnedOrPending,
  reduceMotion,
  releaseRouteHeroOwnership,
  sceneSettled,
  screenReaderEnabled,
  swipeActionInFlight,
  unmatchLoading,
  usesHeroScene,
}: UseProfileExitControllerProps) => {
  const router = useRouter();
  const navigation = useNavigation();
  const profileScrollRef = useAnimatedRef<Animated.ScrollView>();
  const profileScrollOffset = useScrollViewOffset(profileScrollRef);
  const returnScrollDriver = useSharedValue(0);
  const returnScrollActive = useSharedValue(false);
  const returnScrollRequest = useSharedValue<{
    generation: number;
    nonce: number;
    retry: boolean;
  } | null>(null);
  const nextReturnScrollRequestNonceRef = useRef(0);
  const profileExitCoordinator = useRef(createProfileExitCoordinator()).current;
  const [returningToTop, setReturningToTop] = useState(false);
  const [blockedExitRetryRevision, setBlockedExitRetryRevision] = useState(0);
  const returningToTopRef = useRef(false);
  const returnWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topPresentationFramesRef = useRef<[number | null, number | null]>([null, null]);
  const activeReturnGenerationRef = useRef<number | null>(null);
  const startScrollReturnRef = useRef<((generation: number, retry: boolean) => void) | null>(null);
  const finishScrollReturnRef = useRef<((generation: number) => void) | null>(null);
  const returnWatchdogExpiredRef = useRef<((generation: number) => void) | null>(null);
  const armReturnWatchdogRef = useRef<((generation: number, duration: number) => void) | null>(
    null,
  );
  const fallbackClaimedExitRef = useRef<((expectedGeneration?: number) => void) | null>(null);
  const [appStateStatus, setAppStateStatus] = useState<AppStateStatus>(AppState.currentState);
  const appStateRef = useRef<AppStateStatus>(appStateStatus);
  const isFocusedRef = useRef(isFocused);
  const reduceMotionRef = useRef(reduceMotion);
  const screenReaderEnabledRef = useRef(screenReaderEnabled);
  const exitRequested = useRef(false);
  const removalDispatched = useRef(false);
  isFocusedRef.current = isFocused;
  reduceMotionRef.current = reduceMotion;
  screenReaderEnabledRef.current = screenReaderEnabled;
  useAnimatedReaction(
    () => (returnScrollActive.value ? returnScrollDriver.value : null),
    (nextOffset) => {
      if (nextOffset === null) return;
      scrollTo(profileScrollRef, 0, Math.max(0, nextOffset), false);
    },
    [profileScrollRef],
  );

  const clearScrollReturnScheduling = useCallback(() => {
    if (returnWatchdogRef.current !== null) {
      clearTimeout(returnWatchdogRef.current);
      returnWatchdogRef.current = null;
    }
    const [firstFrame, secondFrame] = topPresentationFramesRef.current;
    if (firstFrame !== null) cancelAnimationFrame(firstFrame);
    if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    topPresentationFramesRef.current = [null, null];
  }, []);
  const stopScrollReturnMotion = useCallback(() => {
    clearScrollReturnScheduling();
    returnScrollActive.value = false;
    returnScrollRequest.value = null;
    cancelAnimation(returnScrollDriver);
  }, [clearScrollReturnScheduling, returnScrollActive, returnScrollDriver, returnScrollRequest]);

  const performClaimedExit = useCallback(
    (callbacks: ProfileExitCallbacks, forceOrdinary: boolean): ExitRequestResult => {
      const removeRoute = () => {
        if (removalDispatched.current) return;
        removalDispatched.current = true;
        const dispatchRemoval = () => {
          allowAndroidRemovalRef.current = true;
          if (callbacks.nativeRemoval) callbacks.nativeRemoval();
          else router.back();
        };
        const heroAtRemoval = getHeroStateSnapshot();
        if (!forceOrdinary && heroAtRemoval.id === id && heroAtRemoval.phase === "reverse") {
          deferReverseRemoval(dispatchRemoval);
          return;
        }
        dispatchRemoval();
      };

      const useOrdinaryExit =
        forceOrdinary || reduceMotionRef.current || screenReaderEnabledRef.current;
      if (useOrdinaryExit) {
        releaseRouteHeroOwnership();
        removeRoute();
        callbacks.postHandoff?.();
        return "accepted";
      }

      const result = startReverseHero(id, {
        removeRoute,
        postHandoff: callbacks.postHandoff,
        onWillStart: () => {
          heroProgress.value = 0;
        },
      });
      if (result === "started") return "accepted";
      if (result === "in-flight" || result === "completion-pending") return "blocked";
      if (result === "forward-in-flight") releaseRouteHeroOwnership();

      removeRoute();
      callbacks.postHandoff?.();
      return "accepted";
    },
    [
      allowAndroidRemovalRef,
      deferReverseRemoval,
      heroProgress,
      id,
      releaseRouteHeroOwnership,
      router,
    ],
  );

  const finishClaimedExit = useCallback(
    (callbacks: ProfileExitCallbacks, forceOrdinary: boolean) => {
      stopScrollReturnMotion();
      activeReturnGenerationRef.current = null;
      returningToTopRef.current = false;
      setReturningToTop(false);
      const result = performClaimedExit(callbacks, forceOrdinary);
      if (result === "blocked") {
        profileExitCoordinator.restoreBlocked(callbacks);
        setBlockedExitRetryRevision((revision) => revision + 1);
      }
      return result;
    },
    [profileExitCoordinator, performClaimedExit, stopScrollReturnMotion],
  );

  const fallbackClaimedExit = useCallback(
    (expectedGeneration?: number) => {
      if (!isFocusedRef.current || !navigation.isFocused() || appStateRef.current !== "active") {
        return;
      }
      if (getHeroStateSnapshot().phase !== null) return;
      const callbacks = profileExitCoordinator.commitFallback(expectedGeneration);
      if (!callbacks) return;
      releaseRouteHeroOwnership();
      finishClaimedExit(callbacks, true);
    },
    [profileExitCoordinator, finishClaimedExit, navigation, releaseRouteHeroOwnership],
  );
  fallbackClaimedExitRef.current = fallbackClaimedExit;

  const pauseScrollReturnWithoutExit = useCallback(() => {
    const activeGeneration = activeReturnGenerationRef.current;
    if (activeGeneration === null || !profileExitCoordinator.pause(activeGeneration)) return;
    stopScrollReturnMotion();
    activeReturnGenerationRef.current = profileExitCoordinator.currentGeneration();
  }, [profileExitCoordinator, stopScrollReturnMotion]);

  const notifyScrollReturnFinished = useCallback((generation: number) => {
    finishScrollReturnRef.current?.(generation);
  }, []);
  const notifyReturnWatchdogDuration = useCallback((generation: number, duration: number) => {
    armReturnWatchdogRef.current?.(generation, duration);
  }, []);

  useAnimatedReaction(
    () => returnScrollRequest.value,
    (request, previousRequest) => {
      if (
        !request ||
        request.nonce === previousRequest?.nonce ||
        returnScrollRequest.value?.nonce !== request.nonce ||
        returnScrollRequest.value?.generation !== request.generation
      ) {
        return;
      }

      const liveOffset = Math.max(0, profileScrollOffset.value);
      const duration = getProfileReturnDuration(liveOffset, request.retry);
      cancelAnimation(returnScrollDriver);
      returnScrollDriver.value = liveOffset;
      if (
        returnScrollRequest.value?.nonce !== request.nonce ||
        returnScrollRequest.value?.generation !== request.generation
      ) {
        return;
      }
      scrollTo(profileScrollRef, 0, liveOffset, false);
      returnScrollActive.value = true;
      runOnJS(notifyReturnWatchdogDuration)(request.generation, duration);
      if (liveOffset <= 0.5) {
        // A zero-distance withTiming is not guaranteed to publish a completion
        // callback on every native frame ordering. Commit the exact top pose
        // directly, then preserve the same two presented frames before reverse.
        scrollTo(profileScrollRef, 0, 0, false);
        runOnJS(notifyScrollReturnFinished)(request.generation);
        return;
      }
      returnScrollDriver.value = withTiming(
        0,
        { duration, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (
            !finished ||
            !returnScrollActive.value ||
            returnScrollRequest.value?.nonce !== request.nonce ||
            returnScrollRequest.value?.generation !== request.generation
          ) {
            return;
          }
          scrollTo(profileScrollRef, 0, 0, false);
          runOnJS(notifyScrollReturnFinished)(request.generation);
        },
      );
    },
    [profileScrollRef],
  );

  const startScrollReturn = useCallback(
    (generation: number, retry: boolean) => {
      stopScrollReturnMotion();
      activeReturnGenerationRef.current = generation;
      returningToTopRef.current = true;
      setReturningToTop(true);
      const bootstrapDuration = retry ? RETURN_RETRY_MAX_DURATION_MS : RETURN_MAX_DURATION_MS;
      returnWatchdogRef.current = setTimeout(() => {
        returnWatchdogExpiredRef.current?.(generation);
      }, bootstrapDuration + RETURN_WATCHDOG_GRACE_MS);
      returnScrollRequest.value = {
        generation,
        nonce: ++nextReturnScrollRequestNonceRef.current,
        retry,
      };
    },
    [returnScrollRequest, stopScrollReturnMotion],
  );
  startScrollReturnRef.current = startScrollReturn;

  const armReturnWatchdog = useCallback((generation: number, duration: number) => {
    if (activeReturnGenerationRef.current !== generation) return;
    if (returnWatchdogRef.current !== null) clearTimeout(returnWatchdogRef.current);
    returnWatchdogRef.current = setTimeout(() => {
      returnWatchdogExpiredRef.current?.(generation);
    }, duration + RETURN_WATCHDOG_GRACE_MS);
  }, []);
  armReturnWatchdogRef.current = armReturnWatchdog;

  const finishScrollReturn = useCallback(
    (generation: number) => {
      if (!profileExitCoordinator.markTopPresentation(generation)) return;
      clearScrollReturnScheduling();
      returnScrollActive.value = false;
      const topPresentationGeneration = profileExitCoordinator.currentGeneration();
      activeReturnGenerationRef.current = topPresentationGeneration;

      const firstFrame = requestAnimationFrame(() => {
        if (!profileExitCoordinator.isCurrent(topPresentationGeneration, "top-presentation"))
          return;
        topPresentationFramesRef.current[0] = null;
        const secondFrame = requestAnimationFrame(() => {
          if (!profileExitCoordinator.isCurrent(topPresentationGeneration, "top-presentation"))
            return;
          topPresentationFramesRef.current[1] = null;

          if (
            !isFocusedRef.current ||
            !navigation.isFocused() ||
            appStateRef.current !== "active"
          ) {
            pauseScrollReturnWithoutExit();
            return;
          }
          const exactOwnershipStillValid = hasExactRouteHeroOwnership();
          const motionStillAllowed = !reduceMotionRef.current && !screenReaderEnabledRef.current;
          const actualOffset = Math.max(0, profileScrollOffset.value);
          if (!exactOwnershipStillValid || !motionStillAllowed) {
            fallbackClaimedExitRef.current?.(topPresentationGeneration);
            return;
          }
          if (actualOffset > 0.5) {
            const retryGeneration = profileExitCoordinator.retry(topPresentationGeneration);
            if (retryGeneration === null) {
              fallbackClaimedExitRef.current?.(topPresentationGeneration);
              return;
            }
            startScrollReturnRef.current?.(retryGeneration, true);
            return;
          }

          const callbacks = profileExitCoordinator.commitReverse(topPresentationGeneration);
          if (callbacks) finishClaimedExit(callbacks, false);
        });
        topPresentationFramesRef.current[1] = secondFrame;
      });
      topPresentationFramesRef.current[0] = firstFrame;
    },
    [
      clearScrollReturnScheduling,
      profileExitCoordinator,
      finishClaimedExit,
      hasExactRouteHeroOwnership,
      navigation,
      pauseScrollReturnWithoutExit,
      profileScrollOffset,
      returnScrollActive,
    ],
  );
  finishScrollReturnRef.current = finishScrollReturn;

  const handleReturnWatchdogExpired = useCallback(
    (generation: number) => {
      if (!profileExitCoordinator.isCurrent(generation, "returning")) return;
      const canRetry =
        appStateRef.current === "active" &&
        isFocusedRef.current &&
        navigation.isFocused() &&
        !reduceMotionRef.current &&
        !screenReaderEnabledRef.current &&
        hasExactRouteHeroOwnership();
      if (!canRetry) {
        fallbackClaimedExitRef.current?.(generation);
        return;
      }
      const retryGeneration = profileExitCoordinator.retry(generation);
      if (retryGeneration === null) {
        fallbackClaimedExitRef.current?.(generation);
        return;
      }
      startScrollReturnRef.current?.(retryGeneration, true);
    },
    [profileExitCoordinator, hasExactRouteHeroOwnership, navigation],
  );
  returnWatchdogExpiredRef.current = handleReturnWatchdogExpired;

  const handleHeroContentChange = useCallback(() => {
    if (returningToTopRef.current) {
      fallbackClaimedExitRef.current?.(activeReturnGenerationRef.current ?? undefined);
    }
    router.setParams({ heroTransition: "0" });
  }, [router]);

  const requestExit = useCallback(
    (
      postHandoff?: () => void,
      nativeRemoval?: () => void,
      requestIntent?: unknown,
    ): ExitRequestResult => {
      if (isUnmatchBlockingIntent(requestIntent)) return "blocked";
      if (!isFocusedRef.current || !navigation.isFocused() || appStateRef.current !== "active") {
        return "blocked";
      }
      const heroSnapshot = getHeroStateSnapshot();
      if (
        getIsSwipeActionInFlight() ||
        (usesHeroScene && !sceneSettled) ||
        heroSnapshot.phase !== null ||
        holdsCompletedReverseScene
      ) {
        return "blocked";
      }
      if (Platform.OS === "ios") navigation.setOptions({ gestureEnabled: false });
      if (exitRequested.current) return "blocked";
      exitRequested.current = true;
      const claimResult = profileExitCoordinator.claim({ nativeRemoval, postHandoff });
      if (claimResult !== "first" && profileExitCoordinator.phase() !== "idle") return "blocked";

      const shouldPresentExactHeroPose =
        !reduceMotionRef.current &&
        !screenReaderEnabledRef.current &&
        appStateRef.current === "active" &&
        isFocusedRef.current &&
        hasExactRouteHeroOwnership();
      if (shouldPresentExactHeroPose) {
        const generation = profileExitCoordinator.beginReturn();
        if (generation !== null) {
          startScrollReturnRef.current?.(generation, false);
          return "accepted";
        }
      }

      const callbacks = profileExitCoordinator.commitImmediate();
      if (!callbacks) return "blocked";
      const result = performClaimedExit(callbacks, false);
      if (result === "blocked") {
        profileExitCoordinator.restoreBlocked(callbacks);
        setBlockedExitRetryRevision((revision) => revision + 1);
      }
      return result;
    },
    [
      profileExitCoordinator,
      hasExactRouteHeroOwnership,
      holdsCompletedReverseScene,
      isUnmatchBlockingIntent,
      navigation,
      performClaimedExit,
      sceneSettled,
      usesHeroScene,
    ],
  );

  useEffect(() => {
    if (
      !exitRequested.current ||
      returningToTopRef.current ||
      profileExitCoordinator.phase() !== "idle" ||
      !isFocused ||
      !navigation.isFocused() ||
      appStateStatus !== "active" ||
      appStateRef.current !== "active" ||
      holdsCompletedReverseScene
    ) {
      return;
    }
    if (getHeroStateSnapshot().phase !== null) return;

    const shouldRevalidateExactHeroPose =
      !reduceMotionRef.current && !screenReaderEnabledRef.current && hasExactRouteHeroOwnership();
    if (shouldRevalidateExactHeroPose) {
      const generation = profileExitCoordinator.beginReturn();
      if (generation !== null) {
        startScrollReturnRef.current?.(generation, false);
        return;
      }
    }

    const callbacks = profileExitCoordinator.commitImmediate();
    if (!callbacks) return;
    const result = performClaimedExit(callbacks, false);
    if (result === "blocked") profileExitCoordinator.restoreBlocked(callbacks);
  }, [
    activeHeroVersion,
    appStateStatus,
    blockedExitRetryRevision,
    profileExitCoordinator,
    hasExactRouteHeroOwnership,
    holdsCompletedReverseScene,
    isFocused,
    navigation,
    performClaimedExit,
  ]);

  useEffect(() => {
    if (!returningToTopRef.current || (!reduceMotion && !screenReaderEnabled)) return;
    fallbackClaimedExitRef.current?.(activeReturnGenerationRef.current ?? undefined);
  }, [reduceMotion, screenReaderEnabled]);

  useEffect(() => {
    if (!returningToTopRef.current || hasExactRouteHeroOwnership()) return;
    fallbackClaimedExitRef.current?.(activeReturnGenerationRef.current ?? undefined);
  }, [activeHeroVersion, hasExactRouteHeroOwnership]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      setAppStateStatus(nextState);
      if (!returningToTopRef.current) return;

      if (nextState !== "active") {
        pauseScrollReturnWithoutExit();
        return;
      }
      if (previousState === "active" || profileExitCoordinator.phase() !== "paused") return;
      if (!isFocusedRef.current) return;

      const pausedGeneration = profileExitCoordinator.currentGeneration();
      const canResume =
        isFocusedRef.current &&
        navigation.isFocused() &&
        !reduceMotionRef.current &&
        !screenReaderEnabledRef.current &&
        hasExactRouteHeroOwnership();
      if (!canResume) {
        fallbackClaimedExitRef.current?.(pausedGeneration);
        return;
      }
      const resumedGeneration = profileExitCoordinator.resume();
      if (resumedGeneration === null) {
        fallbackClaimedExitRef.current?.(pausedGeneration);
        return;
      }
      startScrollReturnRef.current?.(resumedGeneration, false);
    });
    return () => subscription.remove();
  }, [
    profileExitCoordinator,
    hasExactRouteHeroOwnership,
    navigation,
    pauseScrollReturnWithoutExit,
  ]);

  useEffect(() => {
    if (!returningToTopRef.current) return;
    if (!isFocused) {
      pauseScrollReturnWithoutExit();
      return;
    }
    if (appStateRef.current !== "active" || profileExitCoordinator.phase() !== "paused") return;

    const pausedGeneration = profileExitCoordinator.currentGeneration();
    const canResume =
      navigation.isFocused() &&
      !reduceMotionRef.current &&
      !screenReaderEnabledRef.current &&
      hasExactRouteHeroOwnership();
    if (!canResume) {
      fallbackClaimedExitRef.current?.(pausedGeneration);
      return;
    }
    const resumedGeneration = profileExitCoordinator.resume();
    if (resumedGeneration === null) {
      fallbackClaimedExitRef.current?.(pausedGeneration);
      return;
    }
    startScrollReturnRef.current?.(resumedGeneration, false);
  }, [
    profileExitCoordinator,
    hasExactRouteHeroOwnership,
    isFocused,
    navigation,
    pauseScrollReturnWithoutExit,
  ]);

  useEffect(
    () => () => {
      activeReturnGenerationRef.current = null;
      stopScrollReturnMotion();
      profileExitCoordinator.dispose();
      finishScrollReturnRef.current = null;
      returnWatchdogExpiredRef.current = null;
      armReturnWatchdogRef.current = null;
      startScrollReturnRef.current = null;
      fallbackClaimedExitRef.current = null;
    },
    [profileExitCoordinator, stopScrollReturnMotion],
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    return navigation.addListener("beforeRemove", (event) => {
      if (allowAndroidRemovalRef.current) return;
      if (getIsSwipeActionInFlight() || isUnmatchOwnedOrPending()) {
        event.preventDefault();
        return;
      }
      if (!usesHeroScene) return;
      event.preventDefault();
      requestExit(undefined, () => navigation.dispatch(event.data.action));
    });
  }, [allowAndroidRemovalRef, isUnmatchOwnedOrPending, navigation, requestExit, usesHeroScene]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    navigation.setOptions({
      gestureEnabled: !usesHeroScene && !swipeActionInFlight && !unmatchLoading,
    });
  }, [navigation, swipeActionInFlight, unmatchLoading, usesHeroScene]);

  useEffect(
    () => () => {
      releaseRouteHeroOwnership();
      endHeroPhotoSession(heroPhotoSessionToken);
    },
    [heroPhotoSessionToken, releaseRouteHeroOwnership],
  );

  const fallbackPendingExit = useCallback(
    () => fallbackClaimedExitRef.current?.(activeReturnGenerationRef.current ?? undefined),
    [],
  );
  const isReturningToTop = useCallback(() => returningToTopRef.current, []);

  return {
    appStateStatus,
    fallbackPendingExit,
    handleHeroContentChange,
    isReturningToTop,
    profileScrollOffset,
    profileScrollRef,
    requestExit,
    returningToTop,
  };
};
