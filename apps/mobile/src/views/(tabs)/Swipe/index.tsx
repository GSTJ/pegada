import { useEffect } from "react";
import * as React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

import { MatchActionBar } from "@/components/MatchActionBar";
import { sendError } from "@/services/errorTracking";
import { trackUser } from "@/services/getInitialRouteName";
import {
  getPushNotificationToken,
  NotificationTokenError,
  setPushNotificationToken
} from "@/services/getPushNotificationToken";
import { processLinks } from "@/services/linking";
import { Actions } from "@/store/reducers/dogs";
import { getCards, getCurrentCardId } from "@/store/selectors";
import { ChangeLocation } from "./components/ChangeLocation";
import SwipeBackButton from "./components/SwipeBackButton";
import SwipeHandler, { swipeHandlerRef } from "./components/SwipeHandler";
import { Swipe } from "./components/SwipeHandler/hooks/useSwipeGesture";
import SwipeRequestFeedback from "./components/SwipeRequestFeedback";
import { Container } from "./styles";

export const useCustomTopInset = () => {
  const insets = useSafeAreaInsets();
  return Math.max(40, insets.top + 5);
};

const MatchActionBarWrapper = () => {
  const currentCard = useSelector(getCurrentCardId);

  if (!currentCard) return null;

  return (
    <MatchActionBar
      onNope={() => swipeHandlerRef.current?.gotoDirection(Swipe.Dislike)}
      onYep={() => swipeHandlerRef.current?.gotoDirection(Swipe.Like)}
      onMaybe={() => swipeHandlerRef.current?.gotoDirection(Swipe.Maybe)}
      animated
    />
  );
};

/** For performance reasons, we only render the first 4 cards */
const MAX_TO_RENDER = 4;

const Matches = () => {
  const topInset = useCustomTopInset();
  const dispatch = useDispatch();
  const cards = useSelector(getCards);

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
    <Container style={{ marginTop: topInset }}>
      <ChangeLocation />
      <Container>
        <SwipeBackButton />
        <SwipeRequestFeedback />
        {cards
          .map((card) => <SwipeHandler key={card.id} card={card} />)
          .slice(0, MAX_TO_RENDER)
          .reverse()}
      </Container>
      <MatchActionBarWrapper />
    </Container>
  );
};

export default Matches;
