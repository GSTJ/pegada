import * as React from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import * as StoreReview from "expo-store-review";

import { useTranslation } from "react-i18next";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import { magicToast } from "react-native-magic-toast";
import {
  StyleSheet,
  withUnistyles,
  useUnistyles,
} from "react-native-unistyles";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Text } from "@/components/text";
import { getTrcpContext } from "@/contexts/trcp-context";
import { analytics } from "@/services/analytics";
import {
  ReviewTrigger,
  SECOND_MESSAGE_TRIGGER_COUNT,
  shouldRequestReview,
} from "@/services/app-review-policy";
import { sendError } from "@/services/error-tracking";
import { getData, StorageKeys, storeData } from "@/services/storage";

const handleReview = async (trigger: ReviewTrigger) => {
  try {
    analytics.track({
      event_type: "App Review",
      event_properties: { trigger },
    });
    await StoreReview.requestReview();
    await storeData(StorageKeys.AppReviewStatus, "completed");
  } catch (error) {
    sendError(error);
  }
};

const NotLikingTheAppModal: React.FC = () => {
  const [feedback, setFeedback] = React.useState("");
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const { hide } = useMagicModal();

  const handleSend = () => {
    analytics.track({
      event_type: "Manual Feedback",
      event_properties: { feedback },
    });

    hide();

    magicToast.success(t("appReview.notLikingTheAppModal.success"));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Title style={styles.title} fontSize="lg" fontWeight="bold">
          {t("appReview.notLikingTheAppModal.title")}
        </Title>
        <CenterText
          style={[styles.centerText, { marginBottom: theme.spacing[1] }]}
        >
          {t("appReview.notLikingTheAppModal.description")}
        </CenterText>
        <Input
          value={feedback}
          onChangeText={setFeedback}
          autoFocus
          onSubmitEditing={handleSend}
          enablesReturnKeyAutomatically
          returnKeyType="send"
          placeholder={t("appReview.notLikingTheAppModal.placeholder")}
        />
        <View style={styles.buttonRow}>
          <SmallButton onPress={handleSend} style={styles.smallButton}>
            {t("appReview.notLikingTheAppModal.send")}
          </SmallButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const AreYouLikingTheAppModal: React.FC<{ trigger: ReviewTrigger }> = ({
  trigger,
}) => {
  const { t } = useTranslation();
  const { hide } = useMagicModal();

  const openReviewModal = () => {
    analytics.track({
      event_type: "Feedback",
      event_properties: { feedback: "liking_the_app" },
    });

    hide();

    void handleReview(trigger);
  };

  const openNotLikingTheAppModal = () => {
    analytics.track({
      event_type: "Feedback",
      event_properties: { feedback: "not_liking_the_app" },
    });

    hide();

    magicModal.show(() => <NotLikingTheAppModal />, {
      style: {
        justifyContent: "flex-end",
      },
    });
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title} fontSize="lg" fontWeight="bold">
        {t("appReview.areYouLikingTheAppModal.title")}
      </Title>
      <CenterText style={styles.centerText}>
        {t("appReview.areYouLikingTheAppModal.description")}
      </CenterText>
      <View style={styles.buttonRow}>
        <SmallButton
          onPress={openNotLikingTheAppModal}
          variant="outline"
          style={styles.smallButton}
        >
          {t("appReview.areYouLikingTheAppModal.no")}
        </SmallButton>
        <SmallButton onPress={openReviewModal} style={styles.smallButton}>
          {t("appReview.areYouLikingTheAppModal.yes")}
        </SmallButton>
      </View>
    </View>
  );
};

type RequestAppReviewOptions = {
  trigger: ReviewTrigger;
  /** Matches the user has, counting the one being celebrated. */
  matchCount?: number;
  /** Messages the user has sent, counted on the device. */
  sentMessageCount?: number;
  /**
   * Asked again once everything below has been decided, right before the
   * modal goes up. A caller that owns a moment rather than a screen state
   * uses this to withdraw the ask while it is still in the air.
   */
  canStillAsk?: () => boolean;
};

/**
 * One ask at a time. Two triggers can overlap by seconds, and without this
 * the second one reads the storage the first has not written yet, passes the
 * same throttle, and stacks a second modal on the first.
 */
let isAskInFlight = false;

export const handleRequestAppReview = async ({
  trigger,
  matchCount = 0,
  sentMessageCount = 0,
  canStillAsk,
}: RequestAppReviewOptions) => {
  if (isAskInFlight) return;
  isAskInFlight = true;

  try {
    const [reviewStatus, lastPromptAt, matchPrompted, isStoreReviewAvailable] =
      await Promise.all([
        getData(StorageKeys.AppReviewStatus),
        getData(StorageKeys.AppReviewRequestDate),
        getData(StorageKeys.AppReviewMatchPrompted),
        // Resolves false on TestFlight, on the web, and on Android below 5.0.
        StoreReview.isAvailableAsync().catch(() => false),
      ]);

    const decision = shouldRequestReview({
      trigger,
      matchCount,
      sentMessageCount,
      reviewStatus,
      lastPromptAt,
      now: new Date(),
      // Absence of the marker covers both halves of "skipped": the prompt was
      // blocked on the celebration screen, or the user was already past their
      // first match when this shipped and never saw that screen at all.
      firstPromptSkipped: matchPrompted !== "true",
      isStoreReviewAvailable,
    });

    if (!decision.allowed) {
      if (decision.blocked) {
        analytics.track({
          event_type: "review_prompt_skipped",
          event_properties: { trigger, reason: decision.reason },
        });
      }

      return;
    }

    // Prevent asking for a review in test accounts
    const dog = await getTrcpContext().client.myDog.get.query();
    const isTestAccount = dog?.user.email.endsWith("@test.com");
    if (isTestAccount) {
      await storeData(StorageKeys.AppReviewStatus, "completed");
      return;
    }

    // Last gate before the modal. Three storage reads, a native availability
    // check and an API round trip sit above this line, and the moment the
    // caller aimed at can be gone by the time they all answer.
    if (canStillAsk?.() === false) return;

    analytics.track({
      event_type: "review_prompt_requested",
      event_properties: { trigger },
    });

    // Finally, we ask for a review
    magicModal.show(() => <AreYouLikingTheAppModal trigger={trigger} />);

    // Recorded after the modal is up, never before. These two are what the
    // user pays for being asked: a month of silence from every trigger, and
    // in the first-match case the end of the second-message fallback. An ask
    // that never reached the screen must not charge them for it.
    await storeData(StorageKeys.AppReviewRequestDate, new Date().toISOString());

    if (trigger === ReviewTrigger.FirstMatch) {
      await storeData(StorageKeys.AppReviewMatchPrompted, "true");
    }
  } finally {
    isAskInFlight = false;
  }
};

/**
 * Trigger 2, the catch-up for everyone trigger 1 could not reach. The count
 * lives on the device because the server has no per-user sent-message total
 * and this only ever has to answer "was that the second one".
 */
export const handleMessageSentAppReview = async () => {
  const stored = Number(await getData(StorageKeys.AppReviewSentMessageCount));
  const sentMessageCount = (Number.isFinite(stored) ? stored : 0) + 1;

  // The counter exists to spot message number two. Past it, stop writing.
  if (sentMessageCount > SECOND_MESSAGE_TRIGGER_COUNT) return;

  await storeData(
    StorageKeys.AppReviewSentMessageCount,
    String(sentMessageCount),
  );

  if (sentMessageCount < SECOND_MESSAGE_TRIGGER_COUNT) return;

  await handleRequestAppReview({
    trigger: ReviewTrigger.SecondMessage,
    sentMessageCount,
  });
};

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingTop: theme.spacing[5],
    paddingRight: theme.spacing[5],
    paddingBottom: theme.spacing[5],
    paddingLeft: theme.spacing[5],
    marginTop: theme.spacing[4],
    marginRight: theme.spacing[4],
    marginBottom: theme.spacing[4],
    marginLeft: theme.spacing[4],
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderBottomRightRadius: theme.radii.lg,
    borderBottomLeftRadius: theme.radii.lg,
    alignSelf: "center",
    maxWidth: 300,
    width: "100%",
    borderWidth: theme.stroke.sm,
    borderColor: theme.colors.border,
  },
  smallButton: {
    paddingTop: 0,
    paddingBottom: 0,
    height: theme.spacing[12],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  centerText: {
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
    marginTop: theme.spacing[5],
  },
  title: {
    textAlign: "center",
    marginBottom: theme.spacing[1],
  },
}));

const SmallButton = withUnistyles(Button);

const CenterText = Text;

const Title = Text;
