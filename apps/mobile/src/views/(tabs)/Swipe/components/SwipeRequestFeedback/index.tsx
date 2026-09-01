import type { RootReducer } from "@/store/reducers";

import { useEffect } from "react";
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

const EmptyState = () => {
  const { t } = useTranslation();

  // The deck running dry is the reason people stop opening the app, and today
  // nothing records how often it happens. Mount-only: this state re-renders on
  // every theme and locale change, and each of those is not a new empty deck.
  useEffect(() => {
    analytics.track({ event_type: "Empty Deck Shown" });
  }, []);

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

  return <EmptyState />;
};

export default SwipeRequestFeedback;
