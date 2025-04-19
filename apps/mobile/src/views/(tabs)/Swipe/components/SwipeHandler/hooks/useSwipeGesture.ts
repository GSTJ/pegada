import { useState } from "react";
import {
  Gesture,
  GestureEventPayload,
  PanGestureHandlerEventPayload
} from "react-native-gesture-handler";
import {
  runOnJS,
  SharedValue,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";

import { ACTION_OFFSET, ACTION_VELOCITY, CARD } from "@/constants";

export interface Translation {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

interface Coordinate {
  x?: number;
  y?: number;
}

export enum Swipe {
  Dislike = "NOT_INTERESTED",
  Like = "INTERESTED",
  Maybe = "MAYBE"
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
  event: Readonly<GestureEventPayload & PanGestureHandlerEventPayload>
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
  animationConfig = { duration: 250 }
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
      callback
    );
  }

  if (willMoveY) {
    translation.y.value = withTiming(
      coordinates.y ?? 0,
      animationConfig,
      callbackY
    );
  }
};

interface UseSwipeGestureProps {
  onSwipeComplete: (data: Swipe) => void;
}

export const useSwipeGesture = ({ onSwipeComplete }: UseSwipeGestureProps) => {
  const [enabled, setEnabled] = useState(true);

  const translation: Translation = {
    x: useSharedValue(0),
    y: useSharedValue(0)
  };

  // We want to guarantee the animation has finished before enabling
  // the card to be swiped again. Otherwise the dog will be able
  // to 'catch' the card on the middle of the animation.
  const safelyEnableWithDelay = (duration: number) => {
    setTimeout(() => setEnabled(true), duration);
  };

  const gotoDirection = (
    swipeDirection: Swipe,
    animationConfig = { duration: 250 }
  ) => {
    "worklet";

    // Avoid concurrency, should gotoDirection only once
    if (!enabled) return;
    runOnJS(setEnabled)(false);

    const swipeCoordinates = getDirectionCoordinates(swipeDirection);
    return gotoCoordinate(
      translation,
      swipeCoordinates,
      () => {
        runOnJS(onSwipeComplete)(swipeDirection);
        runOnJS(safelyEnableWithDelay)(animationConfig.duration);
      },
      animationConfig
    );
  };

  const gestureHandler = Gesture.Pan()
    .onBegin((ctx) => {
      translation.x.value = ctx.translationX;
      translation.y.value = ctx.translationY;
    })
    .onUpdate((event) => {
      translation.x.value = event.translationX;
      translation.y.value = event.translationY;
    })
    .onEnd((event) => {
      const swipeType = getSwipeType(event);

      if (swipeType) {
        return gotoDirection(swipeType);
      }

      translation.x.value = withSpring(0, { stiffness: 50 });
      translation.y.value = withSpring(0, { stiffness: 50 });
    });

  return [translation, gestureHandler, gotoDirection, enabled] as const;
};
