import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/Button";
import {
  OfflineComponent,
  RequestErrorComponent,
  useIsOffline
} from "@/components/NetworkBoundary";
import { Container, Content } from "@/components/NetworkBoundary/styles";
import { Actions, RootReducer } from "@/store/reducers";
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
        <LogoLoading />
      </Content>
    );
  }

  const refetch = () => dispatch(Actions.dogs.list.refetch());

  if (offline) return <OfflineComponent reset={refetch} />;
  if (request.error) return <RequestErrorComponent reset={refetch} />;

  return <EmptyState />;
};

export default SwipeRequestFeedback;
