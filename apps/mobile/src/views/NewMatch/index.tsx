import { useEffect } from "react";
import * as React from "react";
import { BackHandler, ScrollView, View } from "react-native";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { Button } from "@/components/Button";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/text";
import { api } from "@/contexts/trpc-provider";
import { useForAdRequestTracked } from "@/services/advertisement/interstitial";
import { analytics } from "@/services/analytics";
import { haptics } from "@/services/haptics";
import { SceneName } from "@/types/scene-name";

import AnimatedCards from "./animated-cards";
import { ConfettiAnimation } from "./confetti-animation";
import {
  Container,
  Content,
  matchScroll,
  MatchCaption,
  MatchWordmark,
} from "./styles";

const NewMatch: React.FC = () => {
  const { matchId, matchDogId } = useLocalSearchParams<{
    matchDogId: string;
    matchId: string;
  }>();

  const [matchDog] = api.dog.get.useSuspenseQuery(
    { id: matchDogId as string },
    { refetchOnMount: false },
  );

  const { safeLoadAndShow } = useForAdRequestTracked({
    ios: "ca-app-pub-6276873083446538/8154113808",
    android: "ca-app-pub-6276873083446538/5719522151",
  });

  const theme = useTheme();

  const { t } = useTranslation();

  const router = useRouter();

  const handleSendMessage = async () => {
    analytics.track({
      event_type: "New Match",
      event_properties: {
        action: "Send Message",
      },
    });

    await safeLoadAndShow();

    router.push({
      pathname: `${SceneName.Chat}/[matchId]`,
      params: { dogId: matchDogId, matchId },
    });
  };

  const handleSkip = async () => {
    analytics.track({
      event_type: "New Match",
      event_properties: {
        action: "Skip",
      },
    });

    await safeLoadAndShow();

    router.back();
  };

  useFocusEffect(() => {
    // Assume 'skip' if the user presses the back button
    // This is pertinent to Android devices only.
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        void handleSkip();
        return false;
      },
    );

    return () => subscription.remove();
  });

  // Pairs with the confetti Lottie — celebrates the match as the screen appears.
  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <Container testID="new-match-screen">
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <ConfettiAnimation />
      <Content>
        <ScrollView contentContainerStyle={matchScroll}>
          <AnimatedCards matchDog={matchDog} />
          <Text fontSize="xl" fontWeight="light">
            {t("newMatch.youGotA")}
          </Text>
          <MatchWordmark
            source={
              theme.dark
                ? require("@/assets/images/MatchLight.webp")
                : require("@/assets/images/MatchDark.webp")
            }
            contentFit="contain"
          />
          <MatchCaption fontSize="lg" fontWeight="light">
            {t("newMatch.youLikedEachOther", {
              replace: { name: matchDog.name },
            })}
          </MatchCaption>
        </ScrollView>

        <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          <Button testID="new-match-send" onPress={handleSendMessage}>
            {t("newMatch.sendMessage")}
          </Button>
          <Button
            testID="new-match-skip"
            variant="outline"
            onPress={handleSkip}
          >
            {t("newMatch.keepSwiping")}
          </Button>
        </View>
      </Content>
    </Container>
  );
};

const NewMatchScreen = () => (
  <NetworkBoundary>
    <NewMatch />
  </NetworkBoundary>
);

export default NewMatchScreen;
