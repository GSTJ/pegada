import { useEffect } from "react";
import * as React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { MatchActionBar } from "@/components/MatchActionBar";
import {
  cancelNonCurrentSwipeHeroOwner,
  useIsSwipeSurfaceHeroLocked,
} from "@/components/HeroTransition/store";
import { sendError } from "@/services/errorTracking";
import { trackUser } from "@/services/getInitialRouteName";
import {
  getPushNotificationToken,
  NotificationTokenError,
  setPushNotificationToken,
} from "@/services/getPushNotificationToken";
import { processLinks } from "@/services/linking";
import { Actions } from "@/store/reducers/dogs";
import { getCurrentCardId, getRenderableCards } from "@/store/selectors";
import { cancelSwipeRestoreFlight, useIsSwipeActionInFlight } from "@/store/swipeActionFlight";
import { ChangeLocation } from "./components/ChangeLocation";
import ProfileSwipeIntentConsumer from "./components/ProfileSwipeIntentConsumer";
import SwipeBackButton from "./components/SwipeBackButton";
import SwipeHandler, { swipeHandlerRef } from "./components/SwipeHandler";
import { Swipe } from "@/store/swipeTypes";
import SwipeRequestFeedback from "./components/SwipeRequestFeedback";
import { Container } from "./styles";

export const useCustomTopInset = () => {
  const insets = useSafeAreaInsets();
  return Math.max(40, insets.top + 5);
};

const MatchActionBarWrapper = () => {
  const currentCard = useSelector(getCurrentCardId);

  if (!currentCard) return null;

  const swipeCurrentCard = (swipeType: Swipe) => {
    const handler = swipeHandlerRef.current;
    if (handler?.dogId !== currentCard) return;
    handler.gotoDirection(swipeType);
  };

  return (
    <MatchActionBar
      sharedDogId={currentCard}
      sharedRole="source"
      onNope={() => swipeCurrentCard(Swipe.Dislike)}
      onYep={() => swipeCurrentCard(Swipe.Like)}
      onMaybe={() => swipeCurrentCard(Swipe.Maybe)}
      animated
    />
  );
};

const Matches = () => {
  const topInset = useCustomTopInset();
  const dispatch = useDispatch();
  const cards = useSelector(getRenderableCards);
  const currentCardId = useSelector(getCurrentCardId);
  const swipeHeroLocked = useIsSwipeSurfaceHeroLocked();
  const swipeActionInFlight = useIsSwipeActionInFlight();
  const swipeSurfaceLocked = swipeHeroLocked || swipeActionInFlight;

  React.useLayoutEffect(() => {
    cancelNonCurrentSwipeHeroOwner(currentCardId);
  }, [currentCardId]);

  React.useLayoutEffect(
    () => () => {
      cancelSwipeRestoreFlight();
    },
    [],
  );

  useEffect(() => {
    trackUser();
    const processLinksSubscription = processLinks();

    getPushNotificationToken()
      .then(async (token) => {
        if (!token) return;
        await setPushNotificationToken(token);
      })
      .catch((error) => {
        if (error.message === NotificationTokenError.Denied) return; // We don't need to send this error
        sendError(error);
      });

    dispatch(Actions.list.refetch());

    return () => {
      processLinksSubscription.remove();
    };
  }, [dispatch]);

  return (
    <Container
      testID="swipe-screen"
      // Keep the ACTIVE pan's ancestor interactive while its exact gesture
      // lease owns the action token. Every sibling/child surface consumes the
      // action lock independently; hero ownership can still disable the root.
      pointerEvents={swipeHeroLocked ? "none" : "auto"}
      accessibilityElementsHidden={swipeSurfaceLocked}
      importantForAccessibility={swipeSurfaceLocked ? "no-hide-descendants" : "auto"}
      style={{ paddingTop: topInset }}
    >
      <ProfileSwipeIntentConsumer />
      <ChangeLocation />
      <Container>
        <SwipeBackButton />
        <SwipeRequestFeedback />
        {cards.map((card) => <SwipeHandler key={card.id} card={card} />).reverse()}
      </Container>
      <MatchActionBarWrapper />
    </Container>
  );
};

export default Matches;
