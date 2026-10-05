import { ActivityIndicator, Alert, Linking, Share, View } from "react-native";
import { router } from "expo-router";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { Text } from "@/components/Text";
import { APP_SHARE_LINK_BASE } from "@/constants";
import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import { Swipe } from "@/store/swipeTypes";
import * as S from "../styles";

interface ProfileFooterActionsProps {
  dog: SwipeDog;
  matchId?: string;
  onOpenFakeMatch: () => void;
  onUnmatch: () => void;
  unmatchLoading: boolean;
}

const shareProfile = async (dog: SwipeDog) => {
  try {
    await Share.share({
      message: i18n.t("dogProfile.shareLink", {
        link: `${APP_SHARE_LINK_BASE}/dog/${dog.id}`,
      }),
    });
  } catch {
    Alert.alert(
      i18n.t("dogProfile.sharingNotAvailableTitle"),
      i18n.t("dogProfile.sharingNotAvailableMessage", { name: dog.name }),
    );
  }
};

const reportProfile = (dog: SwipeDog) => {
  Alert.alert(i18n.t("dogProfile.report"), i18n.t("dogProfile.reportMessage"), [
    { text: i18n.t("dogProfile.cancel"), style: "cancel" },
    {
      text: i18n.t("dogProfile.yes"),
      style: "destructive",
      onPress: async () => {
        try {
          await Linking.openURL(
            `mailto:report@pegada.app?subject=${encodeURIComponent(
              i18n.t("dogProfile.report"),
            )}&body=${encodeURIComponent(
              i18n.t("dogProfile.reportBody", { id: dog.id, name: dog.name }),
            )}`,
          );
          await getTrcpContext().client.swipe.swipe.mutate({
            id: dog.id,
            swipeType: Swipe.Dislike,
          });
          getTrcpContext().match.getAll.setData(undefined, (request) =>
            request ? request.filter((match) => match.dog.id !== dog.id) : [],
          );
          router.back();
        } catch (error) {
          sendError(error);
        }
      },
    },
  ]);
};

const ProfileFooterActions = ({
  dog,
  matchId,
  onOpenFakeMatch,
  onUnmatch,
  unmatchLoading,
}: ProfileFooterActionsProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const firstName = dog.name.split(" ")[0];

  return (
    <View style={{ gap: theme.spacing[7] }}>
      {Boolean(matchId) && (
        <S.UnmatchButton disabled={unmatchLoading} onPress={onUnmatch}>
          {unmatchLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text fontWeight="bold" color="primary" style={{ textAlign: "center" }}>
              {t("dogProfile.unmatch")}
            </Text>
          )}
        </S.UnmatchButton>
      )}
      <S.ShareButton>
        <Text
          onPress={() => void shareProfile(dog)}
          fontWeight="bold"
          color="primary"
          style={{ textAlign: "center" }}
        >
          {t("dogProfile.shareProfile", { name: firstName })}
        </Text>
      </S.ShareButton>
      <S.ReportButton testID="dog-profile-report">
        <Text onPress={() => reportProfile(dog)} fontWeight="bold" style={{ textAlign: "center" }}>
          {t("dogProfile.reportName", { name: firstName })}
        </Text>
      </S.ReportButton>
      {__DEV__ && matchId ? (
        <S.ReportButton>
          <Text onPress={onOpenFakeMatch} fontWeight="bold" style={{ textAlign: "center" }}>
            Fake Match Screen
          </Text>
        </S.ReportButton>
      ) : null}
    </View>
  );
};

export default ProfileFooterActions;
