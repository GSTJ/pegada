import { useCallback, useEffect } from "react";
import * as React from "react";
import { BackHandler, ScrollView, View } from "react-native";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/text";
import { api } from "@/contexts/trpc-provider";
import { useForAdRequestTracked } from "@/services/advertisement/interstitial";
import { analytics } from "@/services/analytics";
import { handleRequestAppReview } from "@/services/app-review";
import { ReviewTrigger } from "@/services/app-review-policy";
import { isMaestroE2EBuild } from "@/services/e2e";
import { sendError } from "@/services/error-tracking";
import { haptics } from "@/services/haptics";
import { SceneName } from "@/types/scene-name";

import AnimatedCards from "./animated-cards";
import { ConfettiAnimation } from "./confetti-animation";
import { Content, MatchCaption, MatchWordmark, styles } from "./styles";

/** Long enough for the confetti to land and the cards to settle. */
const REVIEW_PROMPT_DELAY_MS = 2500;

const NewMatch: React.FC = () => {
  const { matchId, matchDogId } = useLocalSearchParams<{
    matchDogId: string;
    matchId: string;
  }>();

  const [matchDog] = api.dog.get.useSuspenseQuery(
    { id: matchDogId as string },
    { refetchOnMount: false },
  );

  // The same query the Messages tab reads, and the swipe saga invalidates it
  // on its way here, so this is the count including the match on screen.
  // Deliberately not a suspense query: a slow answer must not hold up the
  // confetti, and no answer at all just means no prompt.
  const { data: matches } = api.match.getAll.useQuery();
  const matchCount = matches?.length;

  const { safeLoadAndShow } = useForAdRequestTracked({
    ios: "ca-app-pub-6276873083446538/8154113808",
    android: "ca-app-pub-6276873083446538/5719522151",
  });

  const { theme } = useUnistyles();

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

    // `replace`, not `push`. This screen is a one-shot celebration: the swipe
    // saga pushes it the moment the API answers a like with `{ match }`, and
    // taking a CTA spends it. Pushing the chat on top left it in the stack, so
    // `chat-back` re-entered the confetti for a match the user had already
    // acknowledged — and the only way out of THAT was "Keep swiping", i.e. two
    // back presses to leave a conversation.
    router.replace({
      pathname: `${SceneName.Chat}/[matchId]`,
      params: { dogId: matchDogId, matchId },
    });
  };

  const handleSkip = useCallback(async () => {
    analytics.track({
      event_type: "New Match",
      event_properties: {
        action: "Skip",
      },
    });

    await safeLoadAndShow();

    router.back();
  }, [router, safeLoadAndShow]);

  // Assume 'skip' if the user presses the back button.
  // This is pertinent to Android devices only.
  //
  // Stable callback, not an inline closure: `useFocusEffect` re-runs whenever
  // the effect identity changes, so an inline one tears the listener down and
  // re-adds it on every render of the screen.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          void handleSkip();

          // Consumed. `handleSkip` owns the pop, and it only gets to do it
          // once the interstitial closes — returning false let the press fall
          // through to the navigator, which popped immediately, so the
          // deferred `router.back()` then popped a SECOND screen out from
          // under the tab the user had returned to.
          return true;
        },
      );

      return () => subscription.remove();
    }, [handleSkip]),
  );

  // Pairs with the confetti Lottie — celebrates the match as the screen appears.
  useEffect(() => {
    haptics.success();
  }, []);

  // The first match is the high point of the whole app, which is why the
  // review prompt now asks here. It waits out the confetti first: a modal on
  // top of the celebration would spend the good mood instead of riding it.
  // Taking either CTA before the delay is up unmounts the screen and cancels
  // the ask, so the prompt never lands on the chat.
  useEffect(() => {
    if (matchCount === undefined) return;

    // Skipped in the Maestro build for the same reason interstitials are: it
    // is a modal that arrives on a timer this screen owns, it eats the tap
    // aimed at the CTA underneath, and no flow can wait for a schedule it
    // cannot see. Both 22-new-match-journey and the grand journey tap a CTA
    // here within seconds of the screen appearing.
    if (isMaestroE2EBuild()) return;

    const timeout = setTimeout(() => {
      handleRequestAppReview({
        trigger: ReviewTrigger.FirstMatch,
        matchCount,
      }).catch(sendError);
    }, REVIEW_PROMPT_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [matchCount]);

  return (
    <View style={styles.container} testID="new-match-screen">
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <ConfettiAnimation />
      <Content style={styles.content}>
        <ScrollView contentContainerStyle={styles.matchScroll}>
          <AnimatedCards matchDog={matchDog} />
          <Text fontSize="xl" fontWeight="light">
            {t("newMatch.youGotA")}
          </Text>
          <MatchWordmark
            style={styles.matchWordmark}
            source={
              theme.dark
                ? require("@/assets/images/MatchLight.webp")
                : require("@/assets/images/MatchDark.webp")
            }
            contentFit="contain"
          />
          <MatchCaption
            style={styles.matchCaption}
            fontSize="lg"
            fontWeight="light"
          >
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
    </View>
  );
};

const NewMatchScreen = () => (
  <NetworkBoundary>
    <NewMatch />
  </NetworkBoundary>
);

export default NewMatchScreen;
