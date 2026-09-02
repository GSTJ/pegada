import type { RootReducer } from "@/store/reducers";

import { useEffect, useRef } from "react";
import { View } from "react-native";

import { router } from "expo-router";

import { useTranslation } from "react-i18next";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/Button";
import {
  OfflineComponent,
  RequestErrorComponent,
  useIsOffline,
} from "@/components/NetworkBoundary";
import { Container, Content } from "@/components/NetworkBoundary/styles";
import { SharePromptCard } from "@/components/SharePromptCard";
import { analytics } from "@/services/analytics";
import { Actions } from "@/store/reducers";
import { getActiveCards } from "@/store/selectors";
import { SceneName } from "@/types/scene-name";

import {
  Description,
  EmptyAnimation,
  LogoLoading,
  Title,
  styles,
} from "./styles";

export const EmptyComponent = () => {
  return (
    <Container>
      <Content>
        <EmptyAnimation
          style={styles.emptyAnimation}
          autoPlay
          source={require("@/assets/animations/empty.json")}
        />
      </Content>
    </Container>
  );
};

/**
 * The share prompt is gated because this screen renders behind the deck on
 * every visit to the swipe tab, so mounting it says nothing about the deck
 * having run out. The copy above can afford to render early since the cards
 * cover it; a prompt cannot, because it fires `Share Prompt Shown` on mount
 * and would count every visit to the tab as a prompt nobody could see,
 * leaving the empty deck funnel reading several times below the real rate.
 *
 * The gate is "no card is on screen", not the `isEmptyDeck` that
 * `Empty Deck Shown` uses below. They come apart on the commonest way of
 * reaching this screen: swiping the last card keeps that dog in
 * `request.data` on purpose, so swipe back has something to restore, and
 * only drops it from the active cards. `isEmptyDeck` is therefore still
 * false while the user is looking at the empty screen, which is a real
 * under-count in `Empty Deck Shown` too, but that event predates this card
 * and correcting it is a change to an already reported number.
 */
const EmptyState = ({ hasVisibleCards }: { hasVisibleCards: boolean }) => {
  const { t } = useTranslation();

  return (
    <Content>
      <View>
        <LogoLoading
          style={styles.logoLoading}
          autoPlay
          source={require("@/assets/animations/loadingLogo.json")}
          speed={0.5}
        />
        <Animated.View entering={FadeInDown} exiting={FadeOutDown}>
          <Title fontWeight="bold" style={styles.title}>
            {t("swipeRequestFeedback.emptyTitle")}
          </Title>
          <Description fontSize="xs" style={styles.description}>
            {t("swipeRequestFeedback.emptyDescription")}
          </Description>
          {hasVisibleCards ? null : <SharePromptCard placement="empty_deck" />}
          <Button
            onPress={() => router.push(SceneName.Preferences)}
            variant="outline"
          >
            {t("swipeRequestFeedback.preferencesButton")}
          </Button>
        </Animated.View>
      </View>
    </Content>
  );
};

const SwipeRequestFeedback = () => {
  const offline = useIsOffline();
  const request = useSelector((state: RootReducer) => state.dogs.request);
  const activeCards = useSelector(getActiveCards);
  const dispatch = useDispatch();

  // This component sits behind the deck on every render, so mounting says
  // nothing about a deck being empty — it mounts mid-load, with cards, and on
  // the error screen. The event belongs to the one state that is genuinely
  // empty: the request settled, it did not fail, we are online, and nothing
  // came back. The ref re-arms when cards arrive, so a later refetch that
  // returns empty again is a second event while a re-render is not.
  const isEmptyDeck =
    !request.loading && !request.error && !offline && request.data.length === 0;
  const hasReportedEmptyDeck = useRef(false);

  useEffect(() => {
    if (!isEmptyDeck) {
      hasReportedEmptyDeck.current = false;
      return;
    }

    if (hasReportedEmptyDeck.current) return;

    hasReportedEmptyDeck.current = true;
    analytics.track({ event_type: "Empty Deck Shown" });
  }, [isEmptyDeck]);

  if (request.loading) {
    return (
      <Content>
        <LogoLoading
          style={styles.logoLoading}
          autoPlay
          source={require("@/assets/animations/loadingLogo.json")}
          speed={0.5}
        />
      </Content>
    );
  }

  const refetch = () => dispatch(Actions.dogs.list.refetch());

  if (offline) return <OfflineComponent reset={refetch} />;
  if (request.error) return <RequestErrorComponent reset={refetch} />;

  return <EmptyState hasVisibleCards={activeCards.length > 0} />;
};

export default SwipeRequestFeedback;
