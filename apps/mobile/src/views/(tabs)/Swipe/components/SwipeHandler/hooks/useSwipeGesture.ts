import { useEffect, useRef, useState } from "react";
import {
  Gesture,
  GestureEventPayload,
  PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import {
  cancelAnimation,
  runOnJS,
  runOnUI,
  SharedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ACTION_OFFSET, ACTION_VELOCITY, CARD } from "@/constants";
import { Swipe } from "@/store/swipeTypes";

export interface Translation {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

interface Coordinate {
  x?: number;
  y?: number;
}

export const getDirectionCoordinates = (swipe: Swipe) => {
  "worklet";

  switch (swipe) {
    case Swipe.Dislike:
      return { x: -CARD.CARD_OUT_WIDTH };

    case Swipe.Like:
      return { x: CARD.CARD_OUT_WIDTH };

    case Swipe.Maybe:
      return { y: -CARD.CARD_OUT_HEIGHT };
    default:
      return {};
  }
};

const getSwipeType = (
  event: Readonly<GestureEventPayload & PanGestureHandlerEventPayload>,
): Swipe | undefined => {
  "worklet";

  const horizontalTrigger =
    Math.abs(event.translationX) > ACTION_OFFSET || Math.abs(event.velocityX) > ACTION_VELOCITY;

  if (horizontalTrigger && event.translationX < 0) return Swipe.Dislike;
  if (horizontalTrigger && event.translationX > 0) return Swipe.Like;

  const verticalTrigger =
    Math.abs(event.translationY) > ACTION_OFFSET || Math.abs(event.velocityY) > ACTION_VELOCITY;

  if (verticalTrigger && event.translationY < 0) return Swipe.Maybe;
};

const gotoCoordinate = (
  translation: Translation,
  coordinates: Coordinate,
  callback: (finished?: boolean) => void,
  animationConfig = { duration: 250 },
) => {
  "worklet";

  const willMoveX = coordinates.x === 0 || coordinates.x;
  const willMoveY = coordinates.y === 0 || coordinates.y;

  // This avoids calling the callback multiple times
  const callbackY = willMoveX ? undefined : callback;

  if (willMoveX) {
    translation.x.value = withTiming(coordinates.x ?? 0, animationConfig, callback);
  }

  if (willMoveY) {
    translation.y.value = withTiming(coordinates.y ?? 0, animationConfig, callbackY);
  }

  return Boolean(willMoveX || willMoveY);
};

interface UseSwipeGestureProps {
  onGestureGrantRequest: (generation: number) => string | null;
  onPositionResetSettled: (ownerToken: string | null) => void;
  onSwipeRequest: (data: Swipe, ownerToken: string) => void;
  onSwipeComplete: (data: Swipe, ownerToken: string | null) => void;
  onSwipeFailure: (ownerToken: string | null) => void;
  onSwipeSettled: (ownerToken: string | null) => void;
}

export const useSwipeGesture = ({
  onGestureGrantRequest,
  onPositionResetSettled,
  onSwipeRequest,
  onSwipeComplete,
  onSwipeFailure,
  onSwipeSettled,
}: UseSwipeGestureProps) => {
  const [enabled, setEnabled] = useState(true);
  const enableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetPaintFrame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const resetRetryFrame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const mounted = useRef(true);

  const translation: Translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
  };
  // JS owns the global token; these generation-scoped UI values ensure no pan
  // becomes visible until that exact grant returns to the current gesture.
  const motionInFlight = useSharedValue(false);
  const motionGeneration = useSharedValue(0);
  const motionOwnerToken = useSharedValue<string | null>(null);
  const panGeneration = useSharedValue(0);
  const panActive = useSharedValue(false);
  const panFinalized = useSharedValue(false);
  const panGrantRequestInFlight = useSharedValue(false);
  const panGrantState = useSharedValue<"denied" | "granted" | "pending">("denied");
  const panOwnerToken = useSharedValue<string | null>(null);
  const pendingTranslationX = useSharedValue(0);
  const pendingTranslationY = useSharedValue(0);
  const pendingSwipe = useSharedValue<Swipe | null>(null);
  const panLeaseInFlight = useSharedValue(false);
  const resetGeneration = useSharedValue(0);
  const resetCompletedAxes = useSharedValue(0);
  const resetPaintScheduledGeneration = useSharedValue(0);
  const resetTerminalGeneration = useSharedValue(0);

  const setEnabledIfMounted = (nextEnabled: boolean) => {
    if (!mounted.current) return;
    setEnabled(nextEnabled);
  };

  const notifyPositionResetSettled = (ownerToken: string | null) => {
    if (!mounted.current) return;
    onPositionResetSettled(ownerToken);
  };

  const cancelEnableTimer = () => {
    if (enableTimer.current) clearTimeout(enableTimer.current);
    enableTimer.current = null;
  };

  const finishSwipeSettle = (generation: number, ownerToken: string | null) => {
    "worklet";

    if (motionGeneration.value !== generation || !motionInFlight.value) return;

    motionInFlight.value = false;
    motionOwnerToken.value = null;
    panLeaseInFlight.value = false;
    runOnJS(setEnabledIfMounted)(true);
    runOnJS(onSwipeSettled)(ownerToken);
  };

  // Preserve the original post-exit delay, but make the callback subordinate
  // to the motion generation so a restore reset invalidates it atomically.
  const safelyEnableWithDelay = (
    duration: number,
    generation: number,
    ownerToken: string | null,
  ) => {
    cancelEnableTimer();
    enableTimer.current = setTimeout(() => {
      enableTimer.current = null;
      if (!mounted.current) return;
      runOnUI(finishSwipeSettle)(generation, ownerToken);
    }, duration);
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelEnableTimer();
      if (resetPaintFrame.current) cancelAnimationFrame(resetPaintFrame.current);
      if (resetRetryFrame.current) cancelAnimationFrame(resetRetryFrame.current);
    };
  }, []);

  const finishResetAfterPaint = (generation: number, ownerToken: string | null) => {
    "worklet";

    if (
      resetGeneration.value !== generation ||
      resetCompletedAxes.value !== 3 ||
      resetPaintScheduledGeneration.value !== generation ||
      resetTerminalGeneration.value === generation
    ) {
      return;
    }

    if (Math.abs(translation.x.value) > 0.01 || Math.abs(translation.y.value) > 0.01) {
      runOnJS(scheduleResetRetry)(generation, ownerToken);
      return;
    }

    resetTerminalGeneration.value = generation;
    motionInFlight.value = false;
    motionOwnerToken.value = null;
    panLeaseInFlight.value = false;
    translation.x.value = 0;
    translation.y.value = 0;
    runOnJS(setEnabledIfMounted)(true);
    runOnJS(notifyPositionResetSettled)(ownerToken);
  };

  const scheduleResetAfterPaint = (generation: number, ownerToken: string | null) => {
    if (!mounted.current) return;
    if (resetPaintFrame.current) cancelAnimationFrame(resetPaintFrame.current);
    resetPaintFrame.current = requestAnimationFrame(() => {
      resetPaintFrame.current = null;
      if (!mounted.current) return;
      runOnUI(finishResetAfterPaint)(generation, ownerToken);
    });
  };

  const retryResetIfCurrent = (generation: number, ownerToken: string | null) => {
    "worklet";

    if (
      motionGeneration.value !== generation ||
      resetGeneration.value !== generation ||
      resetTerminalGeneration.value === generation
    ) {
      return;
    }

    resetPosition(ownerToken);
  };

  const scheduleResetRetry = (generation: number, ownerToken: string | null) => {
    if (!mounted.current) return;
    if (resetRetryFrame.current) cancelAnimationFrame(resetRetryFrame.current);
    resetRetryFrame.current = requestAnimationFrame(() => {
      resetRetryFrame.current = null;
      if (!mounted.current) return;
      runOnUI(retryResetIfCurrent)(generation, ownerToken);
    });
  };

  const completeResetAxis = (
    generation: number,
    axis: 1 | 2,
    finished: boolean | undefined,
    ownerToken: string | null,
  ) => {
    "worklet";

    if (
      motionGeneration.value !== generation ||
      resetGeneration.value !== generation ||
      resetTerminalGeneration.value === generation
    ) {
      return;
    }

    if (finished === false) {
      // A current-generation cancellation may leave a translated/rotated card.
      // Keep the exact lease and retry; only a canonical painted frame releases.
      runOnJS(scheduleResetRetry)(generation, ownerToken);
      return;
    }

    resetCompletedAxes.value = resetCompletedAxes.value | axis;
    if (resetCompletedAxes.value === 3 && resetPaintScheduledGeneration.value !== generation) {
      resetPaintScheduledGeneration.value = generation;
      runOnJS(scheduleResetAfterPaint)(generation, ownerToken);
    }
  };

  const resetPosition = (ownerToken: string | null = null) => {
    "worklet";

    const generation = motionGeneration.value + 1;
    motionGeneration.value = generation;
    resetGeneration.value = generation;
    resetCompletedAxes.value = 0;
    resetPaintScheduledGeneration.value = 0;
    resetTerminalGeneration.value = 0;
    motionInFlight.value = true;
    motionOwnerToken.value = ownerToken;
    panLeaseInFlight.value = Boolean(ownerToken);
    runOnJS(setEnabledIfMounted)(false);
    runOnJS(cancelEnableTimer)();

    // Generation changes before cancellation, so both interrupted callbacks are
    // stale and cannot release this newer reset owner.
    cancelAnimation(translation.x);
    cancelAnimation(translation.y);

    translation.x.value = withSpring(0, { stiffness: 50 }, (finished) => {
      completeResetAxis(generation, 1, finished, ownerToken);
    });
    translation.y.value = withSpring(0, { stiffness: 50 }, (finished) => {
      completeResetAxis(generation, 2, finished, ownerToken);
    });
  };

  const gotoDirection = (
    swipeDirection: Swipe,
    animationConfig = { duration: 250 },
    ownerToken: string | null = null,
  ) => {
    "worklet";

    if (motionInFlight.value) {
      // The active reset keeps its own token. A different newly-acquired token
      // is safe to reject exactly; a duplicate callback cannot release it.
      if (ownerToken && motionOwnerToken.value !== ownerToken) {
        runOnJS(onSwipeFailure)(ownerToken);
      }
      return;
    }

    const generation = motionGeneration.value + 1;
    motionGeneration.value = generation;
    motionInFlight.value = true;
    motionOwnerToken.value = ownerToken;
    runOnJS(cancelEnableTimer)();
    runOnJS(setEnabledIfMounted)(false);

    const swipeCoordinates = getDirectionCoordinates(swipeDirection);
    const didStart = gotoCoordinate(
      translation,
      swipeCoordinates,
      (finished) => {
        if (motionGeneration.value !== generation) return;
        if (finished === false) {
          resetPosition(ownerToken);
          return;
        }
        runOnJS(onSwipeComplete)(swipeDirection, ownerToken);
        runOnJS(safelyEnableWithDelay)(animationConfig.duration, generation, ownerToken);
      },
      animationConfig,
    );
    if (!didStart) resetPosition(ownerToken);
  };

  const settleFinalizedGesture = (
    generation: number,
    ownerToken: string,
    swipeType: Swipe | null,
  ) => {
    "worklet";

    if (panGeneration.value !== generation || panOwnerToken.value !== ownerToken) {
      runOnJS(onSwipeFailure)(ownerToken);
      return;
    }

    runOnJS(setEnabledIfMounted)(false);
    if (swipeType) {
      runOnJS(onSwipeRequest)(swipeType, ownerToken);
      return;
    }

    resetPosition(ownerToken);
  };

  const resolveGestureGrant = (generation: number, ownerToken: string | null) => {
    "worklet";

    if (panGeneration.value !== generation || !panGrantRequestInFlight.value) {
      if (ownerToken) runOnJS(onSwipeFailure)(ownerToken);
      return;
    }

    panGrantRequestInFlight.value = false;
    if (!ownerToken) {
      panGrantState.value = "denied";
      panOwnerToken.value = null;
      if (panFinalized.value) runOnJS(setEnabledIfMounted)(true);
      return;
    }

    panGrantState.value = "granted";
    panOwnerToken.value = ownerToken;
    panLeaseInFlight.value = true;

    if (panFinalized.value) {
      settleFinalizedGesture(generation, ownerToken, pendingSwipe.value);
      return;
    }

    // The finger may have moved while JS arbitrated ownership. Only now is the
    // current generation allowed to become visible.
    translation.x.value = pendingTranslationX.value;
    translation.y.value = pendingTranslationY.value;
  };

  const requestGestureGrant = (generation: number) => {
    const ownerToken = mounted.current ? onGestureGrantRequest(generation) : null;
    if (!mounted.current) {
      onSwipeFailure(ownerToken);
      return;
    }
    runOnUI(resolveGestureGrant)(generation, ownerToken);
  };

  const gestureHandler = Gesture.Pan()
    .onStart((ctx) => {
      if (motionInFlight.value || panLeaseInFlight.value || panGrantRequestInFlight.value) {
        panActive.value = false;
        return;
      }

      const generation = panGeneration.value + 1;
      panGeneration.value = generation;
      panActive.value = true;
      panFinalized.value = false;
      panGrantRequestInFlight.value = true;
      panGrantState.value = "pending";
      panOwnerToken.value = null;
      pendingSwipe.value = null;
      pendingTranslationX.value = ctx.translationX;
      pendingTranslationY.value = ctx.translationY;
      runOnJS(requestGestureGrant)(generation);
    })
    .onUpdate((event) => {
      if (!panActive.value) return;
      pendingTranslationX.value = event.translationX;
      pendingTranslationY.value = event.translationY;
      if (panGrantState.value !== "granted") return;
      translation.x.value = pendingTranslationX.value;
      translation.y.value = pendingTranslationY.value;
    })
    .onEnd((event) => {
      if (!panActive.value) return;
      pendingSwipe.value = getSwipeType(event) ?? null;
    })
    .onFinalize(() => {
      if (!panActive.value) return;
      panActive.value = false;
      panFinalized.value = true;
      if (panGrantState.value !== "granted" || !panOwnerToken.value) return;
      settleFinalizedGesture(panGeneration.value, panOwnerToken.value, pendingSwipe.value);
    });

  return [translation, gestureHandler, gotoDirection, resetPosition, enabled] as const;
};
