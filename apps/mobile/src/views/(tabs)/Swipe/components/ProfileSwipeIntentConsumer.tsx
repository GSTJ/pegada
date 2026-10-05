import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { useSelector, useStore } from "react-redux";

import {
  isSwipeSurfaceHeroLocked,
  useIsSwipeSurfaceHeroLocked,
} from "@/components/HeroTransition/store";
import type { RootReducer } from "@/store/reducers";
import {
  cancelProfileSwipeIntent,
  consumeProfileSwipeIntent,
  useProfileSwipeIntent,
} from "@/store/profileSwipeIntent";
import { getCurrentCardId } from "@/store/selectors";
import { isSwipeActionFlightOwner } from "@/store/swipeActionFlight";
import { swipeHandlerRef } from "./SwipeHandler";

const MAX_ACTIVE_READINESS_FRAMES = 90;
const NEUTRAL_PRESENTATION_FRAMES = 2;

/**
 * Runs a reaction chosen in DogProfile only after the source card is focused,
 * neutral, and visibly presented again.
 */
const ProfileSwipeIntentConsumer = () => {
  const intent = useProfileSwipeIntent();
  const currentCardId = useSelector(getCurrentCardId);
  const sessionId = useSelector((state: RootReducer) => state.dogs.config.sessionId);
  const store = useStore<RootReducer>();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const heroLocked = useIsSwipeSurfaceHeroLocked();
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const scheduledFrame = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (scheduledFrame.current !== null) {
      cancelAnimationFrame(scheduledFrame.current);
      scheduledFrame.current = null;
    }
    if (!intent) return;

    if (
      intent.sessionId !== sessionId ||
      intent.dogId !== currentCardId ||
      !isSwipeActionFlightOwner(intent.token)
    ) {
      cancelProfileSwipeIntent(intent.token);
      return;
    }
    if (!isFocused || appState !== "active" || heroLocked) return;

    let cancelled = false;
    let neutralFrames = 0;
    let readinessFrames = 0;

    const schedule = () => {
      scheduledFrame.current = requestAnimationFrame(attempt);
    };

    const attempt = () => {
      scheduledFrame.current = null;
      if (cancelled) return;

      const state = store.getState();
      const liveSessionId = state.dogs.config.sessionId;
      const liveCurrentCardId = getCurrentCardId(state);
      if (
        liveSessionId !== intent.sessionId ||
        liveCurrentCardId !== intent.dogId ||
        !isSwipeActionFlightOwner(intent.token)
      ) {
        cancelProfileSwipeIntent(intent.token);
        return;
      }
      // `useIsFocused` can remain true for the frame between a native blur and
      // React committing the focus update. Re-read the navigator at the exact
      // adoption boundary so that frame can never swipe an unfocused deck.
      if (
        !navigation.isFocused() ||
        AppState.currentState !== "active" ||
        isSwipeSurfaceHeroLocked()
      ) {
        return;
      }

      if (neutralFrames < NEUTRAL_PRESENTATION_FRAMES) {
        neutralFrames += 1;
        schedule();
        return;
      }

      const handler = swipeHandlerRef.current;
      if (
        handler?.dogId === intent.dogId &&
        handler.gotoDirectionFromProfile(intent.swipeType, intent.token)
      ) {
        consumeProfileSwipeIntent({
          dogId: intent.dogId,
          sessionId: intent.sessionId,
          token: intent.token,
        });
        return;
      }

      readinessFrames += 1;
      if (readinessFrames >= MAX_ACTIVE_READINESS_FRAMES) {
        cancelProfileSwipeIntent(intent.token);
        return;
      }
      schedule();
    };

    schedule();
    return () => {
      cancelled = true;
      if (scheduledFrame.current !== null) {
        cancelAnimationFrame(scheduledFrame.current);
        scheduledFrame.current = null;
      }
    };
  }, [appState, currentCardId, heroLocked, intent, isFocused, navigation, sessionId, store]);

  return null;
};

export default ProfileSwipeIntentConsumer;
