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
 * `isEmptyDeck` gates the share prompt for the same reason `Empty Deck Shown`
 * is gated on it below: this screen renders behind the deck on every visit to
 * the swipe tab, so mounting it says nothing about the deck being empty. The
 * copy above can afford to render early because the cards cover it, but a
 * prompt that fires `Share Prompt Shown` on mount would count every visit to
 * the tab as a prompt nobody could see, and the empty deck funnel it feeds
 * would read as a tap rate several times lower than the real one.
 */
const EmptyState = ({ isEmptyDeck }: { isEmptyDeck: boolean }) => {
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
          {isEmptyDeck ? <SharePromptCard placement="empty_deck" /> : null}
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

  return <EmptyState isEmptyDeck={isEmptyDeck} />;
};

export default SwipeRequestFeedback;
