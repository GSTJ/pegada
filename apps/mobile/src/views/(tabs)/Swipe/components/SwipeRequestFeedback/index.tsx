import type { RootReducer } from "@/store/reducers";

import { useEffect, useRef } from "react";
import { View } from "react-native";

import { router } from "expo-router";

import { useTranslation } from "react-i18next";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/Button";
import { showDogShareOptions } from "@/components/DogShareOptions";
import { pickByGender } from "@/components/DogShareOptions/story/gender";
import {
  OfflineComponent,
  RequestErrorComponent,
  useIsOffline,
} from "@/components/NetworkBoundary";
import { Container, Content } from "@/components/NetworkBoundary/styles";
import {
  trackSharePromptTapped,
  useSharePromptShown,
} from "@/components/SharePromptCard/tracking";
import { api } from "@/contexts/trpc-provider";
import { analytics } from "@/services/analytics";
import { Actions } from "@/store/reducers";
import { SceneName } from "@/types/scene-name";

import {
  Description,
  EmptyAnimation,
  LinkLabel,
  LinkPressable,
  LogoLoading,
  Title,
  styles,
} from "./styles";

/**
 * The empty deck is one of the two places the app asks people to share their
 * own dog, and it reuses the share prompt's own funnel rather than opening a
 * second one: `Share Prompt Shown` / `Share Prompt Tapped` with this
 * placement, straight through to the share sheet's `source`.
 */
const SHARE_PLACEMENT = "empty_deck";

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
 * The screen's only action. It is the same ask as `SharePromptCard`, without
 * the card: a grey panel with its own title and subtitle around a button was
 * a second heading competing with the screen's own, and the screen now has
 * one thing to say.
 *
 * Only the share funnel's two events fire here. An `Empty Deck Action Tapped`
 * alongside them would count the same tap twice.
 */
const ShareOwnDogButton = () => {
  const { t } = useTranslation();

  // Not `useSuspenseQuery`: the empty state is what someone is already
  // looking at, so it must not go blank while the dog loads.
  const { data: dog } = api.myDog.get.useQuery(undefined, {
    refetchOnMount: false,
  });

  useSharePromptShown(SHARE_PLACEMENT, dog?.id);

  // The label names the dog, so there is nothing to render before it arrives.
  // The query is warm by the time anyone swipes to the end of a deck.
  if (!dog) return null;

  // A two-word name in a button label is the owner's, not the dog's.
  const [firstName] = dog.name.split(" ");

  return (
    <Button
      testID="empty-deck-share"
      onPress={() => {
        trackSharePromptTapped(SHARE_PLACEMENT, dog.id);
        void showDogShareOptions(dog, SHARE_PLACEMENT);
      }}
    >
      {t(
        pickByGender(
          dog.gender,
          "swipeRequestFeedback.shareButtonMale",
          "swipeRequestFeedback.shareButtonFemale",
        ),
        { name: firstName },
      )}
    </Button>
  );
};

const EmptyState = () => {
  const { t } = useTranslation();

  return (
    // Still scrollable: the column fits on every phone we support now, but a
    // large accessibility text size can still push the link past the fold.
    <Container style={styles.scroll}>
      <Content>
        <View style={styles.column}>
          {/*
            Its own style rather than the loading spinner's. That one centres
            itself with auto margins on every side, which made the
            illustration absorb the free space and pushed the top of it up
            under the location pill.
          */}
          <LogoLoading
            style={styles.illustration}
            autoPlay
            source={require("@/assets/animations/loadingLogo.json")}
            speed={0.5}
          />
          <Animated.View entering={FadeInDown} exiting={FadeOutDown}>
            <Title fontWeight="bold" style={styles.title}>
              {t("swipeRequestFeedback.emptyTitle")}
            </Title>
            <Description
              fontSize="xs"
              color="subtitle"
              style={styles.description}
            >
              {t("swipeRequestFeedback.emptyDescription")}
            </Description>
            <ShareOwnDogButton />
            {/*
              A link rather than a second button. Preferences is the fallback
              for the people the share ask does not land on, and an outlined
              button next to a filled one reads as two equal choices.
            */}
            <LinkPressable
              testID="empty-deck-preferences"
              accessible
              accessibilityRole="button"
              style={styles.preferencesLink}
              onPress={() => {
                analytics.track({
                  event_type: "Empty Deck Action Tapped",
                  event_properties: { action: "preferences" },
                });
                router.push(SceneName.Preferences);
              }}
            >
              <LinkLabel
                fontWeight="medium"
                fontSize="sm"
                style={styles.preferencesLinkLabel}
              >
                {t("swipeRequestFeedback.preferencesLink")}
              </LinkLabel>
            </LinkPressable>
          </Animated.View>
        </View>
      </Content>
    </Container>
  );
};

const SwipeRequestFeedback = ({ deckIsEmpty }: { deckIsEmpty: boolean }) => {
  const offline = useIsOffline();
  const request = useSelector((state: RootReducer) => state.dogs.request);
  const dispatch = useDispatch();

  // This component sits behind the deck on every render, so mounting says
  // nothing about a deck being empty. It mounts mid-load, with cards, and on
  // the error screen. The event belongs to the one state that is genuinely
  // empty: the request settled, it did not fail, we are online, and there is
  // no card left to act on. `deckIsEmpty` rather than an empty list, because
  // the card that was just swiped stays in the list so it can be swiped back:
  // a deck swiped to the end never empties the list and would never have been
  // counted. The ref re-arms when cards arrive, so a later refetch that
  // returns empty again is a second event while a re-render is not.
  const isEmptyDeck =
    !request.loading && !request.error && !offline && deckIsEmpty;
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

  // Mounting the empty state behind a full deck kept an animation running and
  // asked the server for the dog on behalf of people who never see either.
  if (!deckIsEmpty) return null;

  return <EmptyState />;
};

export default SwipeRequestFeedback;
