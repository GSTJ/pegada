import * as React from "react";
import { StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolate, runOnUI, useAnimatedStyle } from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";

import FeedbackCard from "@/components/FeedbackCard";
import {
  isSwipeSurfaceHeroLocked,
  useIsHeroInteractionLocked,
  useIsHeroSourceOpening,
  useIsSwipeSurfaceHeroLocked,
} from "@/components/HeroTransition/store";
import { ACTION_OFFSET } from "@/constants";
import { Actions } from "@/store/reducers";
import { createSwipeOperationId, SwipeDog } from "@/store/reducers/dogs/swipe";
import { getCurrentCardId } from "@/store/selectors";
import {
  beginSwipeActionFlight,
  cancelSwipeRestoreFlight,
  claimSwipeRestoreFlight,
  endSwipeActionFlight,
  isSwipeActionFlightOwner,
  type SwipeActionFlightToken,
  useIsSwipeActionInFlight,
} from "@/store/swipeActionFlight";
import { Swipe } from "@/store/swipeTypes";
import { useSwipeGesture } from "./hooks/useSwipeGesture";

const ROTATION_DEG = 8;

interface SwipeHandlerProps {
  card: SwipeDog;
}

export interface SwipeHandlerRefProps {
  dogId: string;
  gotoDirection: (swipeType: Swipe) => void;
  gotoDirectionFromProfile: (swipeType: Swipe, ownerToken: SwipeActionFlightToken) => boolean;
}

export const swipeHandlerRef = React.createRef<SwipeHandlerRefProps>();

const SwipeHandler: React.FC<SwipeHandlerProps> = ({ card }) => {
  const dispatch = useDispatch();
  const currentCardId = useSelector(getCurrentCardId);

  const isFirstCard = card.id === currentCardId;
  const heroInteractionLocked = useIsHeroInteractionLocked(card.id);
  const heroSourceOpening = useIsHeroSourceOpening(card.id);
  const swipeHeroLocked = useIsSwipeSurfaceHeroLocked();
  const swipeActionInFlight = useIsSwipeActionInFlight();
  const actionFlightToken = React.useRef<SwipeActionFlightToken | null>(null);
  const gestureFlight = React.useRef<{
    generation: number;
    token: SwipeActionFlightToken;
  } | null>(null);
  const mounted = React.useRef(true);
  const [gestureOwnsActionFlight, setGestureOwnsActionFlight] = React.useState(false);
  const swipeRequestRef = React.useRef<
    (swipeType: Swipe, ownerToken: SwipeActionFlightToken | null) => void
  >(() => {});

  const beginActionFlight = React.useCallback((): SwipeActionFlightToken | null => {
    if (!mounted.current || actionFlightToken.current) return null;
    const token = beginSwipeActionFlight(card.id, "swipe");
    if (!token) return null;
    actionFlightToken.current = token;
    return token;
  }, [card.id]);

  const finishActionFlightToken = React.useCallback((token: SwipeActionFlightToken | null) => {
    if (!token) return;
    if (actionFlightToken.current === token) actionFlightToken.current = null;
    if (gestureFlight.current?.token === token) {
      gestureFlight.current = null;
      if (mounted.current) setGestureOwnsActionFlight(false);
    }
    endSwipeActionFlight(token);
  }, []);

  const finishActionFlight = React.useCallback(() => {
    finishActionFlightToken(actionFlightToken.current);
  }, [finishActionFlightToken]);

  const onSwipeComplete = React.useCallback(
    (swipeType: Swipe, ownerToken: string | null) => {
      if (!mounted.current) {
        finishActionFlightToken(ownerToken);
        return;
      }
      try {
        dispatch(
          Actions.dogs.swipe.request({
            deckMember: true,
            id: card.id,
            operationId: createSwipeOperationId(),
            swipeType,
          }),
        );
      } catch (error) {
        finishActionFlightToken(ownerToken);
        throw error;
      }
    },
    [card.id, dispatch, finishActionFlightToken],
  );

  const requestGestureFlight = React.useCallback(
    (generation: number): SwipeActionFlightToken | null => {
      if (!mounted.current || gestureFlight.current || isSwipeSurfaceHeroLocked()) return null;
      const token = beginActionFlight();
      if (!token) return null;
      gestureFlight.current = { generation, token };
      setGestureOwnsActionFlight(true);
      return token;
    },
    [beginActionFlight],
  );

  const onGestureSwipeRequest = React.useCallback(
    (swipeType: Swipe, ownerToken: string) => {
      if (!mounted.current) {
        finishActionFlightToken(ownerToken);
        return;
      }
      swipeRequestRef.current(swipeType, ownerToken);
    },
    [finishActionFlightToken],
  );

  const finishPositionResetFlight = React.useCallback(
    (ownerToken: string | null) => {
      finishActionFlightToken(ownerToken);
    },
    [finishActionFlightToken],
  );

  const [translation, gestureHandler, gotoDirection, resetPosition, enabled] = useSwipeGesture({
    onGestureGrantRequest: requestGestureFlight,
    onPositionResetSettled: finishPositionResetFlight,
    onSwipeRequest: onGestureSwipeRequest,
    onSwipeComplete,
    onSwipeFailure: finishActionFlightToken,
    onSwipeSettled: finishActionFlightToken,
  });

  const claimRestoreFlight = React.useCallback(() => {
    if (!mounted.current || !isFirstCard) return;
    const token = claimSwipeRestoreFlight(card.id);
    if (!token) return;

    actionFlightToken.current = token;
    gestureFlight.current = null;
    setGestureOwnsActionFlight(false);
    try {
      runOnUI(resetPosition)(token);
    } catch (error) {
      finishActionFlightToken(token);
      throw error;
    }
  }, [card.id, finishActionFlightToken, isFirstCard, resetPosition]);

  const executeSwipe = (swipeType: Swipe, duration: number, ownerToken: SwipeActionFlightToken) => {
    "worklet";

    gotoDirection(swipeType, { duration }, ownerToken);
  };

  const requestSwipe = React.useCallback(
    (
      swipeType: Swipe,
      duration: number,
      resetOnReject: boolean,
      ownedGestureFlightToken: SwipeActionFlightToken | null,
    ) => {
      if (!mounted.current) return;
      const settleRejectedRequest = (ownerToken: SwipeActionFlightToken | null) => {
        if (!resetOnReject) {
          finishActionFlightToken(ownerToken);
          return;
        }
        try {
          runOnUI(resetPosition)(ownerToken);
        } catch (error) {
          finishActionFlightToken(ownerToken);
          throw error;
        }
      };

      if (
        ownedGestureFlightToken &&
        (actionFlightToken.current !== ownedGestureFlightToken ||
          !isSwipeActionFlightOwner(ownedGestureFlightToken))
      ) {
        // A late grant/request must not reset or otherwise disturb the newer
        // motion that replaced it. Its exact stale token is harmless to end.
        finishActionFlightToken(ownedGestureFlightToken);
        return;
      }

      if ((!ownedGestureFlightToken && actionFlightToken.current) || isSwipeSurfaceHeroLocked()) {
        settleRejectedRequest(ownedGestureFlightToken);
        return;
      }

      let requestOwnerToken = ownedGestureFlightToken;
      requestOwnerToken = requestOwnerToken ?? beginActionFlight();
      if (!requestOwnerToken) {
        settleRejectedRequest(null);
        return;
      }

      try {
        runOnUI(executeSwipe)(swipeType, duration, requestOwnerToken);
      } catch (error) {
        settleRejectedRequest(requestOwnerToken);
        throw error;
      }
    },
    [beginActionFlight, executeSwipe, finishActionFlightToken, resetPosition],
  );

  swipeRequestRef.current = (swipeType, ownerToken) =>
    requestSwipe(swipeType, 250, true, ownerToken);

  const triggerAutomaticSwipe = React.useCallback(
    (swipeType: Swipe) => requestSwipe(swipeType, 500, false, null),
    [requestSwipe],
  );

  const triggerProfileSwipe = React.useCallback(
    (swipeType: Swipe, ownerToken: SwipeActionFlightToken): boolean => {
      if (
        !mounted.current ||
        actionFlightToken.current ||
        !isSwipeActionFlightOwner(ownerToken) ||
        isSwipeSurfaceHeroLocked()
      ) {
        return false;
      }

      actionFlightToken.current = ownerToken;
      requestSwipe(swipeType, 500, false, ownerToken);
      return true;
    },
    [requestSwipe],
  );

  // useImperativeHandle unloads the ref depending on component rendering order
  // This is a new behavior that caused bugs, and had to be replaced with a layout effect.
  React.useLayoutEffect(() => {
    if (isFirstCard) {
      swipeHandlerRef.current = {
        dogId: card.id,
        gotoDirection: triggerAutomaticSwipe,
        gotoDirectionFromProfile: triggerProfileSwipe,
      };
    }
    return () => {
      if (swipeHandlerRef.current?.dogId === card.id) swipeHandlerRef.current = null;
    };
  }, [card.id, isFirstCard, triggerAutomaticSwipe, triggerProfileSwipe]);

  React.useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      swipeRequestRef.current = () => {};
      gestureFlight.current = null;
      finishActionFlight();
      cancelSwipeRestoreFlight(card.id);
    };
  }, [card.id, finishActionFlight]);

  React.useLayoutEffect(claimRestoreFlight, [claimRestoreFlight]);

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
    <GestureDetector
      gesture={gestureHandler.enabled(
        isFirstCard &&
          enabled &&
          !heroInteractionLocked &&
          !heroSourceOpening &&
          !swipeHeroLocked &&
          (!swipeActionInFlight || gestureOwnsActionFlight),
      )}
    >
      <Animated.View style={[StyleSheet.absoluteFill, transform]}>
        <FeedbackCard isFirst={isFirstCard} dog={card} translation={translation} />
      </Animated.View>
    </GestureDetector>
  );
};

export default SwipeHandler;
