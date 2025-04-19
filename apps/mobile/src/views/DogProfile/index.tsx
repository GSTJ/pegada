import { useState } from "react";
import * as React from "react";
import { ActivityIndicator, Alert, Linking, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Header, HeaderBackButton } from "@react-navigation/elements";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "styled-components/native";

import MainCard from "@/components/MainCard";
import { MatchActionBar } from "@/components/MatchActionBar";
import {
  NetworkBoundary,
  UnknownErrorComponent
} from "@/components/NetworkBoundary";
import { Text } from "@/components/Text";
import { APP_SHARE_LINK_BASE } from "@/constants";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api } from "@/contexts/TRPCProvider";
import { sendError } from "@/services/errorTracking";
import { useGetFormattedYears } from "@/services/useGetFormattedYears";
import { Actions } from "@/store/reducers";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import { getCurrentCardId } from "@/store/selectors";
import { SceneName } from "@/types/SceneName";
import { useCustomTopInset } from "@/views/(tabs)/Swipe";
import { swipeHandlerRef } from "@/views/(tabs)/Swipe/components/SwipeHandler";
import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/useSwipeGesture";
import { BreedTag } from "@/views/DogProfile/components/BreedTag";
import GoBack from "@/views/DogProfile/components/GoBack";
import * as S from "./styles";

export const ShareButton: React.FC<{ dog: SwipeDog }> = ({ dog }) => {
  const { t } = useTranslation();

  const firstName = dog.name.split(" ")[0];

  const handleShare = async () => {
    try {
      await Share.share({
        message: i18n.t("dogProfile.shareLink", {
          link: `${APP_SHARE_LINK_BASE}/dog/${dog.id}`
        })
      });
    } catch {
      Alert.alert(
        i18n.t("dogProfile.sharingNotAvailableTitle"),
        i18n.t("dogProfile.sharingNotAvailableMessage", {
          name: dog.name
        })
      );
    }
  };

  return (
    <S.ShareButton>
      <Text
        onPress={handleShare}
        fontWeight="bold"
        color="primary"
        style={{ textAlign: "center" }}
      >
        {t("dogProfile.shareProfile", { name: firstName })}
      </Text>
    </S.ShareButton>
  );
};

export const reportUser = (dog: SwipeDog) => {
  Alert.alert(i18n.t("dogProfile.report"), i18n.t("dogProfile.reportMessage"), [
    {
      text: i18n.t("dogProfile.cancel"),
      style: "cancel"
    },
    {
      text: i18n.t("dogProfile.yes"),
      style: "destructive",
      onPress: async () => {
        try {
          await Linking.openURL(
            `mailto:report@pegada.app?subject=${encodeURIComponent(
              i18n.t("dogProfile.report")
            )}&body=${encodeURIComponent(
              i18n.t("dogProfile.reportBody", {
                id: dog.id,
                name: dog.name
              })
            )}`
          );

          await getTrcpContext()
            .client.swipe.swipe.mutate({ id: dog.id, swipeType: Swipe.Dislike })
            .then(() => {
              getTrcpContext().match.getAll.setData(undefined, (request) => {
                if (!request) return [];
                return request.filter((match) => match.dog.id !== dog.id);
              });

              router.back();
            });
        } catch (err) {
          // Silently fail
          sendError(err);
        }
      }
    }
  ]);
};

const useSwipeHandler = (id: string) => {
  const currentCardId = useSelector(getCurrentCardId);
  const dispatch = useDispatch();

  return (swipeType: Swipe) => {
    router.back();

    if (id === currentCardId && swipeHandlerRef.current) {
      return swipeHandlerRef.current.gotoDirection(swipeType);
    }

    dispatch(Actions.dogs.swipe.request({ id: id, swipeType }));
  };
};

const DogProfile = () => {
  const {
    id,
    currentImageIndex = 0,
    matchId
  } = useLocalSearchParams<{
    id: string;
    currentImageIndex?: string;
    matchId?: string;
  }>();

  const swipeHandler = useSwipeHandler(id as string);
  const { t } = useTranslation();

  const insets = useSafeAreaInsets();
  const topInset = useCustomTopInset();
  const router = useRouter();

  const theme = useTheme();

  const matchActionBarHeight = topInset + 100;

  const [unmatchLoading, setUnmatchLoading] = useState(false);
  const handleUnmatch = async () => {
    try {
      setUnmatchLoading(true);
      await getTrcpContext().client.swipe.swipe.mutate({
        id: id as string,
        swipeType: Swipe.Dislike
      });

      getTrcpContext().match.getAll.setData(undefined, (request) => {
        if (!request) return [];
        return request.filter((match) => match.dog.id !== id);
      });

      router.push(SceneName.Messages);
    } catch (err) {
      sendError(err);

      Alert.alert(
        t("dogProfile.somethingWrong"),
        t("dogProfile.tryAgainLater")
      );
    } finally {
      setUnmatchLoading(false);
    }
  };

  const [dog] = api.dog.get.useSuspenseQuery(
    { id: id as string },
    { refetchOnMount: false }
  );

  const firstName = dog.name.split(" ")[0];

  const mainCardStyle = {
    paddingTop: Math.max(insets.top, theme.spacing[6]),
    borderRadius: 0,
    height: S.CARD_HEIGHT
  };

  const getFormattedYears = useGetFormattedYears();

  return (
    <>
      <S.Container>
        <StatusBar style="light" />

        <View style={{ backgroundColor: theme.colors.black }}>
          <MainCard
            startImageIndex={Number(currentImageIndex)}
            shouldShowPersonalInfo={false}
            style={mainCardStyle}
            dog={dog}
          />
        </View>

        <GoBack onPress={() => router.back()} />

        <S.BottomColumn
          style={{
            paddingBottom: matchId ? theme.spacing[8] : matchActionBarHeight
          }}
        >
          <S.Content>
            <BreedTag breed={dog.breed} />
            <S.Name numberOfLines={1}>
              {dog.name}
              {dog.birthDate ? (
                <S.Age>, {getFormattedYears(dog.birthDate)}</S.Age>
              ) : undefined}
            </S.Name>
            <View style={{ gap: theme.spacing[7] }}>
              <S.Description>{dog.bio}</S.Description>
              {Boolean(matchId) && (
                <S.UnmatchButton
                  disabled={unmatchLoading}
                  onPress={() => {
                    void handleUnmatch();
                  }}
                >
                  {unmatchLoading ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Text
                      fontWeight="bold"
                      color="primary"
                      style={{ textAlign: "center" }}
                    >
                      {t("dogProfile.unmatch")}
                    </Text>
                  )}
                </S.UnmatchButton>
              )}
              <ShareButton dog={dog} />
              <S.ReportButton>
                <Text
                  onPress={() => reportUser(dog)}
                  fontWeight="bold"
                  style={{ textAlign: "center" }}
                >
                  {t("dogProfile.reportName", { name: firstName })}
                </Text>
              </S.ReportButton>
              {__DEV__ && matchId ? (
                <S.ReportButton>
                  <Text
                    onPress={() => {
                      router.push({
                        pathname: SceneName.NewMatch,
                        params: { matchDogId: dog.id, matchId: matchId }
                      });
                    }}
                    fontWeight="bold"
                    style={{ textAlign: "center" }}
                  >
                    Fake Match Screen
                  </Text>
                </S.ReportButton>
              ) : null}
            </View>
          </S.Content>
        </S.BottomColumn>
      </S.Container>

      {!matchId && (
        <>
          <S.MatchActionBarGradient
            style={{ height: matchActionBarHeight + theme.spacing[8] }}
          />
          <MatchActionBar
            style={{ bottom: topInset }}
            onNope={() => swipeHandler(Swipe.Dislike)}
            onYep={() => swipeHandler(Swipe.Like)}
            onMaybe={() => swipeHandler(Swipe.Maybe)}
          />
        </>
      )}
    </>
  );
};

const DogProfileErrorState = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ flexGrow: 1, backgroundColor: theme.colors.background }}>
      <Header
        title={t("dogProfile.dogProfile")}
        headerLeft={() => (
          <HeaderBackButton
            labelVisible={false}
            tintColor={theme.colors.primary}
            onPress={() => router.back()}
          />
        )}
        headerRightContainerStyle={{ paddingRight: 16 }}
        headerLeftContainerStyle={{ paddingLeft: 16 }}
        headerTintColor={theme.colors.text}
        headerTitleStyle={{
          fontFamily: theme.typography.fontFamily.bold,
          fontWeight: "bold",
          fontSize: theme.typography.sizes.lg.size
        }}
        headerStyle={{
          backgroundColor: theme.colors.background
        }}
      />

      <UnknownErrorComponent />
    </View>
  );
};

export default () => (
  <NetworkBoundary errorFallback={DogProfileErrorState}>
    <DogProfile />
  </NetworkBoundary>
);
