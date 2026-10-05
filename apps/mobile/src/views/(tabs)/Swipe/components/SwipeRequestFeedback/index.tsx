import type { PropsWithChildren, ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/Button";
import {
  isSwipeSurfaceHeroLocked,
  useIsSwipeSurfaceHeroLocked,
} from "@/components/HeroTransition/store";
import {
  OfflineComponent,
  RequestErrorComponent,
  useIsOffline,
} from "@/components/NetworkBoundary";
import { Container, Content } from "@/components/NetworkBoundary/styles";
import { Actions, RootReducer } from "@/store/reducers";
import { getIsSwipeActionInFlight, useIsSwipeActionInFlight } from "@/store/swipeActionFlight";
import { SceneName } from "@/types/SceneName";
import { Description, EmptyAnimation, LogoLoading, Title } from "./styles";

export const EmptyComponent = () => {
  return (
    <Container>
      <Content>
        <EmptyAnimation />
      </Content>
    </Container>
  );
};

const EmptyState = () => {
  const { t } = useTranslation();

  return (
    <Content>
      <View>
        <LogoLoading />
        <Animated.View entering={FadeInDown} exiting={FadeOutDown}>
          <Title fontWeight="bold" style={{ paddingBottom: 2 }}>
            {t("swipeRequestFeedback.emptyTitle")}
          </Title>
          <Description fontSize="xs" style={{ paddingBottom: 4 }}>
            {t("swipeRequestFeedback.emptyDescription")}
          </Description>
          <Button
            onPress={() => {
              if (getIsSwipeActionInFlight() || isSwipeSurfaceHeroLocked()) return;
              router.push(SceneName.Preferences);
            }}
            variant="outline"
          >
            {t("swipeRequestFeedback.preferencesButton")}
          </Button>
        </Animated.View>
      </View>
    </Content>
  );
};

const FeedbackInteractionBoundary = ({ children }: PropsWithChildren) => {
  const swipeHeroLocked = useIsSwipeSurfaceHeroLocked();
  const swipeActionInFlight = useIsSwipeActionInFlight();
  const interactionLocked = swipeHeroLocked || swipeActionInFlight;

  return (
    <View
      style={{ flex: 1 }}
      pointerEvents={interactionLocked ? "none" : "auto"}
      accessibilityElementsHidden={interactionLocked}
      importantForAccessibility={interactionLocked ? "no-hide-descendants" : "auto"}
    >
      {children}
    </View>
  );
};

const SwipeRequestFeedback = () => {
  const offline = useIsOffline();
  const request = useSelector((state: RootReducer) => state.dogs.request);
  const dispatch = useDispatch();

  let feedback: ReactNode;
  if (request.loading) {
    feedback = (
      <Content>
        <LogoLoading />
      </Content>
    );
  } else {
    const refetch = () => {
      if (getIsSwipeActionInFlight() || isSwipeSurfaceHeroLocked()) return;
      dispatch(Actions.dogs.list.refetch());
    };

    if (offline) feedback = <OfflineComponent reset={refetch} />;
    else if (request.error) feedback = <RequestErrorComponent reset={refetch} />;
    else feedback = <EmptyState />;
  }

  return <FeedbackInteractionBoundary>{feedback}</FeedbackInteractionBoundary>;
};

export default SwipeRequestFeedback;
