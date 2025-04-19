import * as React from "react";
import { BackHandler, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { Button } from "@/components/Button";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/Text";
import { api } from "@/contexts/TRPCProvider";
import { useForAdRequestTracked } from "@/services/advertisement/interstitial";
import { analytics } from "@/services/analytics";
import { SceneName } from "@/types/SceneName";
import AnimatedCards from "./AnimatedCards";
import { ConfettiAnimation } from "./ConfettiAnimation";
import { Container, Content } from "./styles";

const NewMatch: React.FC = () => {
  const { matchId, matchDogId } = useLocalSearchParams<{
    matchDogId: string;
    matchId: string;
  }>();

  const [matchDog] = api.dog.get.useSuspenseQuery(
    { id: matchDogId as string },
    { refetchOnMount: false }
  );

  const { safeLoadAndShow } = useForAdRequestTracked({
    ios: "ca-app-pub-6276873083446538/8154113808",
    android: "ca-app-pub-6276873083446538/5719522151"
  });

  const theme = useTheme();

  const { t } = useTranslation();

  const router = useRouter();

  const handleSendMessage = async () => {
    analytics.track({
      event_type: "New Match",
      event_properties: {
        action: "Send Message"
      }
    });

    await safeLoadAndShow();

    router.push({
      pathname: `${SceneName.Chat}/[matchId]`,
      params: { dogId: matchDogId, matchId }
    });
  };

  const handleSkip = async () => {
    analytics.track({
      event_type: "New Match",
      event_properties: {
        action: "Skip"
      }
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
      }
    );

    return () => subscription.remove();
  });

  return (
    <Container>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <ConfettiAnimation />
      <Content>
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            justifyContent: "center",
            flexGrow: 1
          }}
        >
          <AnimatedCards matchDog={matchDog} />
          <Text fontSize="xl" fontWeight="light">
            {t("newMatch.youGotA")}
          </Text>
          <Image
            source={
              theme.dark
                ? require("@/assets/images/MatchLight.webp")
                : require("@/assets/images/MatchDark.webp")
            }
            style={{
              height: 50,
              width: "100%"
            }}
            contentFit="contain"
          />
          <Text
            style={{
              textAlign: "center",
              marginTop: 12,
              maxWidth: 200
            }}
            fontSize="lg"
            fontWeight="light"
          >
            {t("newMatch.youLikedEachOther", {
              replace: { name: matchDog.name }
            })}
          </Text>
        </ScrollView>

        <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          <Button onPress={handleSendMessage}>
            {t("newMatch.sendMessage")}
          </Button>
          <Button variant="outline" onPress={handleSkip}>
            {t("newMatch.keepSwiping")}
          </Button>
        </View>
      </Content>
    </Container>
  );
};

export default () => (
  <NetworkBoundary>
    <NewMatch />
  </NetworkBoundary>
);
