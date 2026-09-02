import type { RootReducer } from "@/store/reducers";

import type { ShareAction } from "react-native";

import { useEffect, useRef, useState } from "react";
import { Alert, Share, View } from "react-native";

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
import { APP_SHARE_LINK_BASE } from "@/constants";
import { api } from "@/contexts/trpc-provider";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import {
  getPushNotificationToken,
  isPushDeniedError,
  setPushNotificationToken,
} from "@/services/get-push-notification-token";
import { getData, StorageKeys, storeData } from "@/services/storage";
import { Actions } from "@/store/reducers";
import { SceneName } from "@/types/scene-name";

import {
  EmptyDeckAction,
  isNewDogsAlertRequested,
  PushPermission,
  pushPermissionFromToken,
  shareOutcomeOf,
} from "./new-dogs-alert";
import {
  Description,
  DoneCheck,
  DoneLabel,
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
 * The opt-in for an alert that does not exist yet. Nothing sends a "new dogs
 * near you" push today, so the button only stores the intent: the share of
 * people who tap it here decides whether that alert is worth building.
 */
const NotifyNewDogsButton = () => {
  const { t } = useTranslation();
  const [storedLocally, setStoredLocally] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestAlert = api.user.requestNewDogsAlert.useMutation();
  // The user carries the answer across installs and across a cleared local
  // state, so the button cannot offer the opt-in a second time to someone who
  // already took it. This is a plain query on purpose: the empty deck still
  // has to render while it is in flight or failing.
  const me = api.user.me.useQuery();

  const requested = isNewDogsAlertRequested({
    storedLocally,
    requestedAt: me.data?.newDogsAlertRequestedAt,
  });

  // The local flag is the fast path: it answers before the request comes back
  // and it keeps answering with no network at all.
  useEffect(() => {
    getData(StorageKeys.NewDogsAlertRequested)
      .then((value) => setStoredLocally(Boolean(value)))
      .catch(sendError);
  }, []);

  const handlePress = async () => {
    setLoading(true);

    let pushPermission = PushPermission.Unavailable;

    try {
      const token = await getPushNotificationToken();
      pushPermission = pushPermissionFromToken(token);
      if (token) await setPushNotificationToken(token);
    } catch (error) {
      // A refusal is one of the answers this button expects, so only the rest
      // is worth reporting. The prompt itself already sent its own event, so
      // this one only carries the outcome.
      if (isPushDeniedError(error)) {
        pushPermission = PushPermission.Denied;
      } else {
        sendError(error);
      }
    }

    analytics.track({
      event_type: "Empty Deck Action Tapped",
      event_properties: {
        action: EmptyDeckAction.NotifyNewDogs,
        push_permission: pushPermission,
      },
    });

    // A refused permission is still someone asking to be told, so the intent
    // is recorded either way and the readout keeps the two apart.
    try {
      await requestAlert.mutateAsync();
      await storeData(StorageKeys.NewDogsAlertRequested, "requested");
      setStoredLocally(true);
    } catch (error) {
      sendError(error);
      Alert.alert(t("common.somethingWrong"), t("common.tryAgainLater"));
    } finally {
      setLoading(false);
    }
  };

  // Once the opt-in is taken there is nothing left to press, so it stops being
  // a button. It used to stay one and go disabled, which paints the whole
  // control at half opacity: pale pink on white, 1.7:1, and no sign of why it
  // would not respond. A check and a full contrast label say the same thing
  // and read as an answer rather than a dead control.
  if (requested) {
    return (
      <View style={styles.notifyDone}>
        <DoneCheck width={16} height={15} />
        <DoneLabel
          fontSize="lg"
          fontWeight="bold"
          style={styles.notifyDoneText}
        >
          {t("swipeRequestFeedback.notifyNewDogsDone")}
        </DoneLabel>
      </View>
    );
  }

  return (
    <Button
      // On a fresh install the answer is only on the server, so the button
      // stays out of reach until it arrives. Offering it in that window lets
      // someone who already opted in tap a second time.
      disabled={me.isPending}
      loading={loading}
      onPress={() => void handlePress()}
    >
      {t("swipeRequestFeedback.notifyNewDogsButton")}
    </Button>
  );
};

const InviteFriendButton = () => {
  const { t } = useTranslation();

  const handlePress = async () => {
    let result: ShareAction | undefined;

    try {
      result = await Share.share({
        message: t("swipeRequestFeedback.inviteFriendMessage", {
          link: `${APP_SHARE_LINK_BASE}/store`,
        }),
      });
    } catch (error) {
      sendError(error);
    }

    // One event per tap, fired once the sheet settles, so the funnel counts
    // taps and carries whether the invite actually went out.
    analytics.track({
      event_type: "Empty Deck Action Tapped",
      event_properties: {
        action: EmptyDeckAction.InviteFriend,
        share_result: shareOutcomeOf(result),
      },
    });
  };

  return (
    <Button onPress={() => void handlePress()} variant="outline">
      {t("swipeRequestFeedback.inviteFriendButton")}
    </Button>
  );
};

const EmptyState = () => {
  const { t } = useTranslation();

  return (
    // The column runs past the fold on a short phone, and the last thing in it
    // is the preferences button the copy points at. Scrolling is the safety
    // net: `Content` still centres the column whenever it fits.
    <Container style={styles.scroll}>
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
            <View style={styles.actions}>
              <NotifyNewDogsButton />
              <InviteFriendButton />
              {/*
                Sits below the two actions rather than above them: those two are
                what this screen was built to offer, and the share ask is the
                third thing to try, not the headline. The card owns the gap
                between itself and the preferences link below.

                No render gate of its own. The whole component already returns
                null unless the deck is empty, and the card waits for the dog
                before it paints, so `Share Prompt Shown` cannot fire for a
                prompt nobody saw.
              */}
              <SharePromptCard placement="empty_deck" />
              <Button
                onPress={() => {
                  analytics.track({
                    event_type: "Empty Deck Action Tapped",
                    event_properties: { action: EmptyDeckAction.Preferences },
                  });
                  router.push(SceneName.Preferences);
                }}
                variant="outline"
              >
                {t("swipeRequestFeedback.preferencesButton")}
              </Button>
            </View>
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
  // asked the server about the alert opt-in for people who never see either.
  if (!deckIsEmpty) return null;

  return <EmptyState />;
};

export default SwipeRequestFeedback;
