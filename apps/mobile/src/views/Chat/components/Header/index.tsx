import { useRef } from "react";
import { ActivityIndicator, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import BackArrow from "@/assets/images/BackArrow.svg";
import {
  createHeroNavigationWatchdog,
  startHero,
} from "@/components/HeroTransition/store";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/text";
import { getTrcpContext } from "@/contexts/trcp-context";
import { api } from "@/contexts/trpc-provider";
import { SceneName } from "@/types/scene-name";

import * as S from "./styles";
import { styles } from "./styles";

export const HEADER_HEIGHT = 65;

const DogProfileInfo = ({
  dogId,
  matchId,
}: {
  dogId: string;
  matchId: string;
}) => {
  const [dog] = api.dog.get.useSuspenseQuery(
    { id: dogId },
    { refetchOnMount: false },
  );
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  // A plain View anchor, not a ref straight to `S.Picture`: expo-image's ref
  // doesn't expose `measureInWindow`, but a wrapping host View always does.
  const pictureAnchorRef = useRef<View>(null);

  const openDogProfile = () => {
    const navigate = (heroTransition?: string) => {
      router.push({
        pathname: `${SceneName.Profile}/[id]`,
        params: { matchId, id: dogId, heroTransition },
      });
    };

    if (reduceMotion) return navigate();

    // Keep the destination's exact query hot even if this already-rendered
    // header outlives React Query's cache window.
    getTrcpContext().dog.get.setData({ id: dogId }, dog);

    const finishNavigation = createHeroNavigationWatchdog(navigate);

    if (!pictureAnchorRef.current || !dog.images[0]?.url) {
      finishNavigation();
      return;
    }

    pictureAnchorRef.current.measureInWindow((x, y, width, height) => {
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
          from: {
            x,
            y,
            width,
            height,
            borderRadius: Math.min(width, height) / 2,
          },
        });
      });
    });
  };

  return (
    <S.PressableAreaFlex
      onPress={openDogProfile}
      style={styles.pressableAreaFlex}
    >
      <View style={styles.profileInfoContainer}>
        <View ref={pictureAnchorRef}>
          <S.Picture
            source={{
              uri: dog.images[0]?.url,
              blurhash: dog.images[0]?.blurhash ?? undefined,
            }}
            style={styles.picture}
          />
        </View>
        <Text numberOfLines={1} fontWeight="bold">
          {dog.name}
        </Text>
      </View>
    </S.PressableAreaFlex>
  );
};

/** No photo to morph yet, so these fall back to a plain (non-hero) navigate. */
const useNavigateToDogProfile = () => {
  const router = useRouter();
  const { dogId, matchId } = useLocalSearchParams();

  return () =>
    router.push({
      pathname: `${SceneName.Profile}/[id]`,
      params: { matchId: matchId ?? "", id: dogId as string },
    });
};

const DogProfileError = () => {
  const { t } = useTranslation();
  const navigateToDogProfile = useNavigateToDogProfile();

  return (
    <S.PressableAreaFlex
      onPress={navigateToDogProfile}
      style={styles.pressableAreaFlex}
    >
      <View style={styles.profileInfoContainer}>
        <S.Picture style={styles.picture} />
        <Text numberOfLines={1}>{t("dogProfile.profileInfoError")}</Text>
      </View>
    </S.PressableAreaFlex>
  );
};

const DogProfileInfoLoading = () => {
  const navigateToDogProfile = useNavigateToDogProfile();

  return (
    <S.PressableAreaFlex
      onPress={navigateToDogProfile}
      style={styles.pressableAreaFlex}
    >
      <View style={styles.profileInfoLoadingContainer}>
        <ActivityIndicator />
      </View>
    </S.PressableAreaFlex>
  );
};

const Header = () => {
  const router = useRouter();

  const { theme } = useUnistyles();

  const { dogId, matchId } = useLocalSearchParams();

  const insets = useSafeAreaInsets();

  return (
    <S.Header
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
        },
      ]}
    >
      <S.BackTouchArea
        testID="chat-back"
        onPress={() => router.back()}
        style={styles.backTouchArea}
      >
        <BackArrow height={15} width={15} fill={theme.colors.text} />
      </S.BackTouchArea>
      <NetworkBoundary
        errorFallback={DogProfileError}
        suspenseFallback={<DogProfileInfoLoading />}
      >
        <DogProfileInfo
          dogId={dogId as string}
          matchId={(matchId as string) ?? ""}
        />
      </NetworkBoundary>
    </S.Header>
  );
};

export default Header;
