import { useEffect } from "react";
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
import { sendError } from "@/services/error-tracking";
import { getData, StorageKeys, storeData } from "@/services/storage";

const handleReview = async () => {
  try {
    analytics.track({ event_type: "App Review" });
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

const AreYouLikingTheAppModal: React.FC = () => {
  const { t } = useTranslation();
  const { hide } = useMagicModal();

  useEffect(() => {
    analytics.track({ event_type: "App Review Request" });
  }, []);

  const openReviewModal = () => {
    analytics.track({
      event_type: "Feedback",
      event_properties: { feedback: "liking_the_app" },
    });

    hide();

    void handleReview();
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

const isOlderThanAMonth = (date: string) =>
  new Date(date) < new Date(new Date().setMonth(new Date().getMonth() - 1));

export const handleRequestAppReview = async () => {
  const appReviewStatus = await getData(StorageKeys.AppReviewStatus);

  // The user has already reviewed the app
  if (appReviewStatus === "completed") return;

  const lastRequestedDate = await getData(StorageKeys.AppReviewRequestDate);

  // We have already asked for a review recently
  if (lastRequestedDate && !isOlderThanAMonth(lastRequestedDate)) return;

  await storeData(StorageKeys.AppReviewRequestDate, new Date().toISOString());

  // Prevent asking for a review in test accounts
  const dog = await getTrcpContext().client.myDog.get.query();
  const isTestAccount = dog?.user.email.endsWith("@test.com");
  if (isTestAccount) return storeData(StorageKeys.AppReviewStatus, "completed");

  // Finally, we ask for a review
  magicModal.show(() => <AreYouLikingTheAppModal />);
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
