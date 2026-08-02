import type { SwipeDog } from "@/store/reducers/dogs/swipe";

import { useState } from "react";
import * as React from "react";
import { ActivityIndicator, Alert, Linking, Share, View } from "react-native";

import { router, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { Header, HeaderBackButton } from "@react-navigation/elements";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "styled-components/native";

import MainCard from "@/components/MainCard";
import { MatchActionBar } from "@/components/MatchActionBar";
import {
  NetworkBoundary,
  UnknownErrorComponent,
} from "@/components/NetworkBoundary";
import { APP_SHARE_LINK_BASE } from "@/constants";
import { getTrcpContext } from "@/contexts/trcp-context";
import { api } from "@/contexts/trpc-provider";
import { sendError } from "@/services/error-tracking";
import { useGetFormattedYears } from "@/services/use-get-formatted-years";
import { Actions } from "@/store/reducers";
import { getCurrentCardId } from "@/store/selectors";
import { SceneName } from "@/types/scene-name";
import { useCustomTopInset } from "@/views/(tabs)/Swipe";
import { swipeHandlerRef } from "@/views/(tabs)/Swipe/components/SwipeHandler";
import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/use-swipe-gesture";
import { BreedTag } from "@/views/DogProfile/components/breed-tag";
import GoBack from "@/views/DogProfile/components/GoBack";

import * as S from "./styles";

export const ShareButton: React.FC<{ dog: SwipeDog }> = ({ dog }) => {
  const { t } = useTranslation();

  const [firstName] = dog.name.split(" ");

  const handleShare = async () => {
    try {
      await Share.share({
        message: i18n.t("dogProfile.shareLink", {
          link: `${APP_SHARE_LINK_BASE}/dog/${dog.id}`,
        }),
      });
    } catch {
      Alert.alert(
        i18n.t("dogProfile.sharingNotAvailableTitle"),
        i18n.t("dogProfile.sharingNotAvailableMessage", {
          name: dog.name,
        }),
      );
    }
  };

  return (
    <S.ShareButton>
      <S.ActionLabel onPress={handleShare} fontWeight="bold" color="primary">
        {t("dogProfile.shareProfile", { name: firstName })}
      </S.ActionLabel>
    </S.ShareButton>
  );
};

export const reportUser = (dog: SwipeDog) => {
  Alert.alert(i18n.t("dogProfile.report"), i18n.t("dogProfile.reportMessage"), [
    {
      text: i18n.t("dogProfile.cancel"),
      style: "cancel",
    },
    {
      text: i18n.t("dogProfile.yes"),
      style: "destructive",
      onPress: async () => {
        try {
          await Linking.openURL(
            `mailto:report@pegada.app?subject=${encodeURIComponent(
              i18n.t("dogProfile.report"),
            )}&body=${encodeURIComponent(
              i18n.t("dogProfile.reportBody", {
                id: dog.id,
                name: dog.name,
              }),
            )}`,
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
        } catch (error) {
          // Silently fail
          sendError(error);
        }
      },
    },
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

    dispatch(Actions.dogs.swipe.request({ id, swipeType }));
  };
};

const DogProfile = () => {
  const {
    id,
    currentImageIndex = 0,
    matchId,
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
        swipeType: Swipe.Dislike,
      });

      getTrcpContext().match.getAll.setData(undefined, (request) => {
        if (!request) return [];
        return request.filter((match) => match.dog.id !== id);
      });

      router.push(SceneName.Messages);
    } catch (error) {
      sendError(error);

      Alert.alert(
        t("dogProfile.somethingWrong"),
        t("dogProfile.tryAgainLater"),
      );
    } finally {
      setUnmatchLoading(false);
    }
  };

  const [dog] = api.dog.get.useSuspenseQuery(
    { id: id as string },
    { refetchOnMount: false },
  );

  const [firstName] = dog.name.split(" ");

  const mainCardStyle = {
    paddingTop: Math.max(insets.top, theme.spacing[6]),
    borderRadius: 0,
    height: S.CARD_HEIGHT,
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

        <GoBack testID="dog-profile-close" onPress={() => router.back()} />

        <S.BottomColumn
          style={{
            paddingBottom: matchId ? theme.spacing[8] : matchActionBarHeight,
          }}
        >
          <S.Content>
            <BreedTag breed={dog.breed} />
            <S.Name testID="dog-profile-name" numberOfLines={1}>
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
                    <S.ActionLabel fontWeight="bold" color="primary">
                      {t("dogProfile.unmatch")}
                    </S.ActionLabel>
                  )}
                </S.UnmatchButton>
              )}
              <ShareButton dog={dog} />
              <S.ReportButton testID="dog-profile-report">
                <S.ActionLabel
                  onPress={() => reportUser(dog)}
                  fontWeight="bold"
                >
                  {t("dogProfile.reportName", { name: firstName })}
                </S.ActionLabel>
              </S.ReportButton>
              {__DEV__ && matchId ? (
                <S.ReportButton>
                  <S.ActionLabel
                    onPress={() => {
                      router.push({
                        pathname: SceneName.NewMatch,
                        params: { matchDogId: dog.id, matchId },
                      });
                    }}
                    fontWeight="bold"
                  >
                    Fake Match Screen
                  </S.ActionLabel>
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

const ErrorHeaderBackButton = () => {
  const theme = useTheme();

  return (
    <HeaderBackButton
      displayMode="minimal"
      tintColor={theme.colors.primary}
      onPress={() => router.back()}
    />
  );
};

const DogProfileErrorState = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <S.ErrorScreen>
      <Header
        title={t("dogProfile.dogProfile")}
        headerLeft={ErrorHeaderBackButton}
        headerRightContainerStyle={S.headerRight}
        headerLeftContainerStyle={S.headerLeft}
        headerTintColor={theme.colors.text}
        headerTitleStyle={[
          S.headerTitle,
          {
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.sizes.lg.size,
          },
        ]}
        headerStyle={{
          backgroundColor: theme.colors.background,
        }}
      />

      <UnknownErrorComponent />
    </S.ErrorScreen>
  );
};

const DogProfileScreen = () => (
  <NetworkBoundary errorFallback={DogProfileErrorState}>
    <DogProfile />
  </NetworkBoundary>
);

export default DogProfileScreen;
