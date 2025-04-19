import { useEffect } from "react";
import * as React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import { magicToast } from "react-native-magic-toast";
import * as StoreReview from "expo-store-review";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import styled from "styled-components/native";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";
import { getData, StorageKeys, storeData } from "@/services/storage";

const Container = styled.View`
  padding: ${({ theme }) => theme.spacing[5]}px;
  margin: ${({ theme }) => theme.spacing[4]}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radii.lg}px;
  align-self: center;
  max-width: 300px;
  width: 100%;
  border-width: ${({ theme }) => theme.stroke.sm}px;
  border-color: ${({ theme }) => theme.colors.border};
`;

const SmallButton = styled(Button)`
  padding-top: 0px;
  padding-bottom: 0px;
  height: ${({ theme }) => theme.spacing[12]}px;
  flex: 1;
`;

const CenterText = styled(Text)`
  text-align: center;
`;

const ButtonRow = styled.View`
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing[2]}px;
  margin-top: ${({ theme }) => theme.spacing[5]}px;
`;

const Title = styled(CenterText).attrs({
  fontSize: "lg",
  fontWeight: "bold"
})`
  margin-bottom: ${({ theme }) => theme.spacing[1]}px;
`;

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
  const theme = useTheme();
  const { hide } = useMagicModal();

  const handleSend = () => {
    analytics.track({
      event_type: "Manual Feedback",
      event_properties: { feedback }
    });

    hide();

    magicToast.success(t("appReview.notLikingTheAppModal.success"));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Container>
        <Title>{t("appReview.notLikingTheAppModal.title")}</Title>
        <CenterText style={{ marginBottom: theme.spacing[1] }}>
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
        <ButtonRow>
          <SmallButton onPress={handleSend}>
            {t("appReview.notLikingTheAppModal.send")}
          </SmallButton>
        </ButtonRow>
      </Container>
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
      event_properties: { feedback: "liking_the_app" }
    });

    hide();

    void handleReview();
  };

  const openNotLikingTheAppModal = () => {
    analytics.track({
      event_type: "Feedback",
      event_properties: { feedback: "not_liking_the_app" }
    });

    hide();

    magicModal.show(() => <NotLikingTheAppModal />, {
      style: {
        justifyContent: "flex-end"
      }
    });
  };

  return (
    <Container>
      <Title>{t("appReview.areYouLikingTheAppModal.title")}</Title>
      <CenterText>
        {t("appReview.areYouLikingTheAppModal.description")}
      </CenterText>
      <ButtonRow>
        <SmallButton onPress={openNotLikingTheAppModal} variant="outline">
          {t("appReview.areYouLikingTheAppModal.no")}
        </SmallButton>
        <SmallButton onPress={openReviewModal}>
          {t("appReview.areYouLikingTheAppModal.yes")}
        </SmallButton>
      </ButtonRow>
    </Container>
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
