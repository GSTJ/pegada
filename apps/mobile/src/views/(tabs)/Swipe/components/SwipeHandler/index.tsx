import type { Swipe } from "./hooks/use-swipe-gesture";
import type { SwipeDog } from "@/store/reducers/dogs/swipe";
import type { SwipeKind, SwipeSource } from "@pegada/shared/analytics/events";

import { useEffect } from "react";
import * as React from "react";
import { StyleSheet } from "react-native";

import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnUI,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";

import FeedbackCard from "@/components/FeedbackCard";
import { ACTION_OFFSET } from "@/constants";
import { analytics } from "@/services/analytics";
import { useDidMountEffect } from "@/services/utils";
import { Actions } from "@/store/reducers";
import { getCurrentCardId } from "@/store/selectors";

import { SNAP_BACK_SPRING, useSwipeGesture } from "./hooks/use-swipe-gesture";

const ROTATION_DEG = 8;

/**
 * The store speaks in the API's enum, the funnel speaks in the product's words.
 * Translating here keeps "Swipe" readable in PostHog without renaming anything
 * the swipe mutation depends on.
 */
const SWIPE_KIND: Record<Swipe, SwipeKind> = {
  INTERESTED: "like",
  MAYBE: "maybe",
  NOT_INTERESTED: "pass",
};

type SwipeHandlerProps = {
  card: SwipeDog;
};

export type SwipeHandlerRefProps = {
  gotoDirection: (swipeType: Swipe) => void;
};

export const swipeHandlerRef = React.createRef<SwipeHandlerRefProps>();

const SwipeHandler: React.FC<SwipeHandlerProps> = ({ card }) => {
  const dispatch = useDispatch();
  const currentCardId = useSelector(getCurrentCardId);

  const isFirstCard = card.id === currentCardId;

  // Every swipe in the app lands here, gesture or button, which is what makes
  // one event per swipe possible without counting a card twice.
  const onSwipeComplete = (swipeType: Swipe, source: SwipeSource) => {
    analytics.track({
      event_type: "Swipe",
      event_properties: {
        dog_id: card.id,
        source,
        swipe_type: SWIPE_KIND[swipeType],
      },
    });

    dispatch(Actions.dogs.swipe.request({ id: card.id, swipeType }));
  };

  const [translation, gestureHandler, gotoDirection, enabled] = useSwipeGesture(
    {
      onSwipeComplete,
    },
  );

  // Memoised so the effect below doesn't reinstall the imperative handle on
  // every render — a worklet is a new function object each time otherwise.
  const automaticSwipe = React.useCallback(
    (swipeType: Swipe) => {
      "worklet";

      gotoDirection(swipeType, { duration: 500 }, "button");
    },
    [gotoDirection],
  );

  // useImperativeHandle unloads the ref depending on component rendering order
  // This is a new behavior that caused bugs, and had to be replaced with useEffect
  useEffect(() => {
    if (isFirstCard) {
      swipeHandlerRef.current = {
        gotoDirection: runOnUI(automaticSwipe),
      };
    }
  }, [automaticSwipe, isFirstCard]);

  useDidMountEffect(() => {
    if (isFirstCard) {
      translation.x.value = withSpring(0, SNAP_BACK_SPRING);
      translation.y.value = withSpring(0, SNAP_BACK_SPRING);
    }
  }, [isFirstCard]);

  const transform = useAnimatedStyle(() => {
    "worklet";
    const deg = interpolate(
      translation.x.value * -1,
      [-ACTION_OFFSET, 0, ACTION_OFFSET],
      [ROTATION_DEG, 0, -ROTATION_DEG],
    );

    return {
      transform: [
        { translateX: translation.x.value },
        { translateY: translation.y.value },
        { rotate: `${deg}deg` },
      ],
      ...(isFirstCard && { zIndex: 2 }),
    };
  });

  return (
    <GestureDetector gesture={gestureHandler.enabled(isFirstCard && enabled)}>
      <Animated.View style={[StyleSheet.absoluteFill, transform]}>
        <FeedbackCard
          isFirst={isFirstCard}
          dog={card}
          translation={translation}
        />
      </Animated.View>
    </GestureDetector>
  );
};

export default SwipeHandler;
