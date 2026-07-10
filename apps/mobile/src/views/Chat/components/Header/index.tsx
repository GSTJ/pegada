import { useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import BackArrow from "@/assets/images/BackArrow.svg";
import { createHeroNavigationWatchdog, startHero } from "@/components/HeroTransition/store";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api } from "@/contexts/TRPCProvider";
import { SceneName } from "@/types/SceneName";
import * as S from "./styles";

export const HEADER_HEIGHT = 65;

const DogProfileInfo = ({ dogId, matchId }: { dogId: string; matchId: string }) => {
  const [dog] = api.dog.get.useSuspenseQuery({ id: dogId }, { refetchOnMount: false });
  const router = useRouter();
  const pictureRef = useRef<View>(null);

  const openDogProfile = () => {
    // Keep the destination's exact query hot even if this already-rendered
    // header outlives React Query's cache window.
    getTrcpContext().dog.get.setData({ id: dogId }, dog);

    const navigate = (heroTransition?: string) => {
      router.push({
        pathname: `${SceneName.Profile}/[id]`,
        params: { matchId, id: dogId, heroTransition },
      });
    };
    const finishNavigation = createHeroNavigationWatchdog(navigate);

    if (!pictureRef.current || !dog.images[0]?.url) {
      return;
    }

    pictureRef.current.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        finishNavigation();
        return;
      }

      finishNavigation(() => {
        startHero({
          id: dogId,
          source: {
            uri: dog.images[0]?.url,
            blurhash: dog.images[0]?.blurhash,
          },
          from: { x, y, width, height, borderRadius: Math.min(width, height) / 2 },
        });
      });
    });
  };

  return (
    <S.PressableAreaFlex onPress={openDogProfile}>
      <S.ProfileInfoContainer>
        <S.Picture
          ref={pictureRef}
          source={{
            uri: dog.images[0]?.url,
            blurhash: dog.images[0]?.blurhash ?? undefined,
          }}
        />
        <Text numberOfLines={1} fontWeight="bold">
          {dog.name}
        </Text>
      </S.ProfileInfoContainer>
    </S.PressableAreaFlex>
  );
};

const DogProfileError = () => {
  const { t } = useTranslation();
  return (
    <S.ProfileInfoContainer>
      <S.Picture />
      <Text numberOfLines={1}>{t("dogProfile.profileInfoError")}</Text>
    </S.ProfileInfoContainer>
  );
};

const DogProfileInfoLoading = () => {
  return (
    <S.ProfileInfoLoadingContainer>
      <ActivityIndicator />
    </S.ProfileInfoLoadingContainer>
  );
};

const Header = () => {
  const router = useRouter();

  const theme = useTheme();

  const { dogId, matchId } = useLocalSearchParams();

  const insets = useSafeAreaInsets();

  return (
    <S.Header
      style={{
        paddingTop: insets.top,
        height: HEADER_HEIGHT + insets.top,
      }}
    >
      <S.BackTouchArea testID="chat-back" onPress={() => router.back()}>
        <BackArrow height={15} width={15} fill={theme.colors.text} />
      </S.BackTouchArea>
      <NetworkBoundary errorFallback={DogProfileError} suspenseFallback={<DogProfileInfoLoading />}>
        <DogProfileInfo dogId={dogId as string} matchId={matchId as string} />
      </NetworkBoundary>
    </S.Header>
  );
};

export default Header;
