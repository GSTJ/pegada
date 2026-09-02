import type { SwipeSource } from "@pegada/shared/analytics/events";
import type {
  GestureEventPayload,
  PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";

import { useState } from "react";

import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ACTION_OFFSET, ACTION_VELOCITY, CARD } from "@/constants";
import { haptics } from "@/services/haptics";

// Fast enough to feel responsive, with enough travel time to read as the card
// returning under its own spring. Successful throws keep their timing below.
export const SNAP_BACK_SPRING = { duration: 230, dampingRatio: 0.9 } as const;

export type Translation = {
  x: SharedValue<number>;
  y: SharedValue<number>;
};

type Coordinate = {
  x?: number;
  y?: number;
};

export enum Swipe {
  Dislike = "NOT_INTERESTED",
  Like = "INTERESTED",
  Maybe = "MAYBE",
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
    Math.abs(event.translationX) > ACTION_OFFSET ||
    Math.abs(event.velocityX) > ACTION_VELOCITY;

  if (horizontalTrigger && event.translationX < 0) return Swipe.Dislike;
  if (horizontalTrigger && event.translationX > 0) return Swipe.Like;

  const verticalTrigger =
    Math.abs(event.translationY) > ACTION_OFFSET ||
    Math.abs(event.velocityY) > ACTION_VELOCITY;

  if (verticalTrigger && event.translationY < 0) return Swipe.Maybe;
};

const gotoCoordinate = (
  translation: Translation,
  coordinates: Coordinate,
  callback: () => void,
  animationConfig = { duration: 250 },
) => {
  "worklet";

  const willMoveX = coordinates.x === 0 || coordinates.x;
  const willMoveY = coordinates.y === 0 || coordinates.y;

  // This avoids calling the callback multiple times
  const callbackY = willMoveX ? undefined : callback;

  if (willMoveX) {
    translation.x.value = withTiming(
      coordinates.x ?? 0,
      animationConfig,
      callback,
    );
  }

  if (willMoveY) {
    translation.y.value = withTiming(
      coordinates.y ?? 0,
      animationConfig,
      callbackY,
    );
  }
};

type UseSwipeGestureProps = {
  onSwipeComplete: (data: Swipe, source: SwipeSource) => void;
};

export const useSwipeGesture = ({ onSwipeComplete }: UseSwipeGestureProps) => {
  const [enabled, setEnabled] = useState(true);
  const reduceMotion = useReducedMotion();

  const translation: Translation = {
    x: useSharedValue(0),
    y: useSharedValue(0),
  };

  // Tracks whether we've already fired the threshold-crossing haptic for the
  // current gesture, so it ticks once per crossing instead of every frame.
  const hasCrossedThreshold = useSharedValue(false);

  // We want to guarantee the animation has finished before enabling
  // the card to be swiped again. Otherwise the dog will be able
  // to 'catch' the card on the middle of the animation.
  const safelyEnableWithDelay = (duration: number) => {
    setTimeout(() => setEnabled(true), duration);
  };

  const gotoDirection = (
    swipeDirection: Swipe,
    animationConfig = { duration: 250 },
    // Defaults to the gesture because that is the only caller that cannot pass
    // it: `onEnd` runs on the UI thread with no idea a button exists.
    source: SwipeSource = "gesture",
  ) => {
    "worklet";

    // Avoid concurrency, should gotoDirection only once
    if (!enabled) return;
    runOnJS(setEnabled)(false);

    // Confirms the action itself (button tap or a released swipe past the
    // threshold) — distinct from the lighter "crossing" tick in `onUpdate`.
    runOnJS(haptics.light)();

    const swipeCoordinates = getDirectionCoordinates(swipeDirection);
    return gotoCoordinate(
      translation,
      swipeCoordinates,
      () => {
        runOnJS(onSwipeComplete)(swipeDirection, source);
        runOnJS(safelyEnableWithDelay)(animationConfig.duration);
      },
      animationConfig,
    );
  };

  const gestureHandler = Gesture.Pan()
    .onBegin((ctx) => {
      translation.x.value = ctx.translationX;
      translation.y.value = ctx.translationY;
      hasCrossedThreshold.value = false;
    })
    .onUpdate((event) => {
      translation.x.value = event.translationX;
      translation.y.value = event.translationY;

      // Fire a tick exactly once per crossing of the decision threshold,
      // reusing the same rule `onEnd` uses to commit to a direction.
      const crossedNow = Boolean(getSwipeType(event));
      if (crossedNow && !hasCrossedThreshold.value) {
        runOnJS(haptics.selection)();
      }
      hasCrossedThreshold.value = crossedNow;
    })
    .onEnd((event) => {
      const swipeType = getSwipeType(event);

      if (swipeType) {
        return gotoDirection(swipeType);
      }

      if (reduceMotion) {
        translation.x.value = 0;
        translation.y.value = 0;
        return;
      }

      translation.x.value = withSpring(0, SNAP_BACK_SPRING);
      translation.y.value = withSpring(0, SNAP_BACK_SPRING);
    });

  return [translation, gestureHandler, gotoDirection, enabled] as const;
};
