import { SlideInRight, SlideOutRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useTheme } from "styled-components/native";

import SwipeBackArrow from "@/assets/images/SwipeBackArrow.svg";
import {
  isSwipeSurfaceHeroLocked,
  useIsSwipeDeckMutationHeroLocked,
  useIsSwipeSurfaceHeroLocked,
} from "@/components/HeroTransition/store";
import { useUnsafeIsPremium } from "@/hooks/usePayments";
import { analytics } from "@/services/analytics";
import { Actions } from "@/store/reducers";
import type { RootReducer } from "@/store/reducers";
import { getCurrentCardId, getLastCardId } from "@/store/selectors";
import {
  beginSwipeRestoreFlight,
  commitSwipeRestoreFlight,
  endSwipeActionFlight,
  getIsSwipeActionInFlight,
  useIsSwipeActionInFlight,
} from "@/store/swipeActionFlight";
import { SceneName } from "@/types/SceneName";
import { Container, GoBack } from "./styles";

const SwipeBackButton = () => {
  const dispatch = useDispatch();
  const store = useStore<RootReducer>();
  const lastCardId = useSelector(getLastCardId);
  const theme = useTheme();

  const isPremium = useUnsafeIsPremium();
  const router = useRouter();
  const heroOwnsDeck = useIsSwipeDeckMutationHeroLocked();
  const swipeHeroLocked = useIsSwipeSurfaceHeroLocked();
  const swipeActionInFlight = useIsSwipeActionInFlight();
  const interactionLocked = swipeHeroLocked || swipeActionInFlight;

  const canGoBack = Boolean(lastCardId);

  if (!canGoBack || heroOwnsDeck || swipeActionInFlight) return null;

  const handleGoBack = () => {
    if (getIsSwipeActionInFlight() || isSwipeSurfaceHeroLocked()) return;
    analytics.track({ event_type: "Swipe Back" });

    // Free users can't swipe back
    if (!isPremium) {
      return router.push(SceneName.UpgradeWall);
    }

    if (!lastCardId) return;
    const stateBeforeUndo = store.getState();
    if (getLastCardId(stateBeforeUndo) !== lastCardId) return;
    const undoEntry = stateBeforeUndo.dogs.config.swipeJournal.find(
      (entry) => entry.id === lastCardId && entry.status === "succeeded",
    );
    if (!undoEntry) return;
    const restoreToken = beginSwipeRestoreFlight(lastCardId);
    if (!restoreToken) return;
    if (!commitSwipeRestoreFlight(lastCardId, restoreToken)) {
      endSwipeActionFlight(restoreToken);
      return;
    }
    try {
      dispatch(
        Actions.dogs.swipe.swipeBack({
          id: lastCardId,
          operationId: undoEntry.operationId,
          sessionId: undoEntry.sessionId,
        }),
      );
      const stateAfterUndo = store.getState();
      const rejected = stateAfterUndo.dogs.config.swipeJournal.some(
        (entry) => entry.operationId === undoEntry.operationId,
      );
      if (rejected || getCurrentCardId(stateAfterUndo) !== lastCardId) {
        endSwipeActionFlight(restoreToken);
      }
    } catch (error) {
      endSwipeActionFlight(restoreToken);
      throw error;
    }
  };

  return (
    <Container exiting={SlideOutRight} entering={SlideInRight}>
      <GoBack
        disabled={!canGoBack || interactionLocked}
        accessibilityElementsHidden={interactionLocked}
        importantForAccessibility={interactionLocked ? "no-hide-descendants" : "auto"}
        onPress={handleGoBack}
      >
        <SwipeBackArrow width={21} height={15} fill={theme.colors.primary} />
      </GoBack>
    </Container>
  );
};

export default SwipeBackButton;
