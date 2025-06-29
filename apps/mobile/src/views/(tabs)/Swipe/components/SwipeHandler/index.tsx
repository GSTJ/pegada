import type { SwipeDog } from "@/store/reducers/dogs/swipe";
import { useCallback, useEffect } from "react";
import * as React from "react";
import { StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnUI,
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";

import type { Swipe } from "./hooks/useSwipeGesture";
import FeedbackCard from "@/components/FeedbackCard";
import { ACTION_OFFSET } from "@/constants";
import { useIsFirstRenderRef } from "@/hooks/useIsFirstRenderRef";
import { Actions } from "@/store/reducers";
import { getCurrentCardId } from "@/store/selectors";
import { useSwipeGesture } from "./hooks/useSwipeGesture";

const ROTATION_DEG = 8;

interface SwipeHandlerProps {
  card: SwipeDog;
}

export interface SwipeHandlerRefProps {
  gotoDirection: (swipeType: Swipe) => void;
}

export const swipeHandlerRef = React.createRef<SwipeHandlerRefProps>();

const SwipeHandler: React.FC<SwipeHandlerProps> = ({ card }) => {
  const dispatch = useDispatch();
  const currentCardId = useSelector(getCurrentCardId);

  const isFirstCard = card.id === currentCardId;

  const onSwipeComplete = (swipeType: Swipe) => {
    dispatch(Actions.dogs.swipe.request({ id: card.id, swipeType }));
  };

  const [translation, gestureHandler, gotoDirection, enabled] = useSwipeGesture(
    { onSwipeComplete }
  );

  const automaticSwipe = useCallback(
    (swipeType: Swipe) => {
      "worklet";

      gotoDirection(swipeType, { duration: 500 });
    },
    [gotoDirection]
  );

  useEffect(() => {
    if (!isFirstCard) return;

    // eslint-disable-next-line react-compiler/react-compiler
    swipeHandlerRef.current = {
      gotoDirection: runOnUI(automaticSwipe)
    };
  }, [automaticSwipe, isFirstCard]);

  const isFirstRender = useIsFirstRenderRef();

  useEffect(() => {
    if (!isFirstCard || isFirstRender.current) return;

    // eslint-disable-next-line react-compiler/react-compiler
    translation.x.value = withSpring(0, { stiffness: 50 });
    // eslint-disable-next-line react-compiler/react-compiler
    translation.y.value = withSpring(0, { stiffness: 50 });
  }, [isFirstCard, isFirstRender, translation.x, translation.y]);

  const transform = useAnimatedStyle(() => {
    "worklet";
    const deg = interpolate(
      translation.x.value * -1,
      [-ACTION_OFFSET, 0, ACTION_OFFSET],
      [ROTATION_DEG, 0, -ROTATION_DEG]
    );

    return {
      transform: [
        { translateX: translation.x.value },
        { translateY: translation.y.value },
        { rotate: `${deg}deg` }
      ],
      ...(isFirstCard && { zIndex: 2 })
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
