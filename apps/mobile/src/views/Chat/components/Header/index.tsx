import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import BackArrow from "@/assets/images/BackArrow.svg";
import {
  acknowledgeHeroSourceFrame,
  cancelHeroSourceOpening,
  createHeroForwardFlight,
  createHeroNavigationWatchdog,
  isHeroSourceSurfaceHeld,
  markHeroSourceFocused,
  releaseHeroSourceOwnership,
  setHeroSourceOpening,
  shouldHideHeroEndpointPhoto,
  startHero,
  useHeroState,
  useIsHeroInteractionLocked,
  useIsHeroSourceOpening,
} from "@/components/HeroTransition/store";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api } from "@/contexts/TRPCProvider";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useScreenReaderEnabled } from "@/hooks/useScreenReaderEnabled";
import { SceneName } from "@/types/SceneName";
import * as S from "./styles";

export const HEADER_HEIGHT = 65;

const DogProfileInfo = ({ dogId, matchId }: { dogId: string; matchId: string }) => {
  const [dog] = api.dog.get.useSuspenseQuery({ id: dogId }, { refetchOnMount: false });
  const router = useRouter();
  const pictureRef = useRef<View>(null);
  const forwardFlight = useRef(createHeroForwardFlight()).current;
  const navigationWatchdogRef = useRef<ReturnType<typeof createHeroNavigationWatchdog> | null>(
    null,
  );
  const ownedForwardRunRef = useRef<number | null>(null);
  const isFocused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const screenReaderEnabled = useScreenReaderEnabled();
  const activeHero = useHeroState();
  const interactionLocked = useIsHeroInteractionLocked(dogId);
  const sourceOpening = useIsHeroSourceOpening(dogId);
  const sourceSurfaceHeld = isHeroSourceSurfaceHeld(activeHero, dogId, "chat");
  const profileInteractionLocked = interactionLocked || sourceOpening || sourceSurfaceHeld;
  const hideRealPhoto = shouldHideHeroEndpointPhoto(activeHero, dogId, true, "chat");
  const { t } = useTranslation();

  useEffect(() => {
    forwardFlight.onSourceFocusChange(isFocused);
    if (!isFocused && forwardFlight.status() === "measuring") {
      cancelHeroSourceOpening(dogId);
    }
  }, [dogId, forwardFlight, isFocused]);

  useEffect(
    () => () => {
      navigationWatchdogRef.current?.cancel();
      navigationWatchdogRef.current = null;
      if (ownedForwardRunRef.current !== null) {
        releaseHeroSourceOwnership({
          id: dogId,
          sourceKind: "chat",
          forwardRunId: ownedForwardRunRef.current,
        });
        ownedForwardRunRef.current = null;
      }
      setHeroSourceOpening(dogId, false);
      forwardFlight.fail();
    },
    [dogId, forwardFlight],
  );

  useEffect(() => {
    if (
      !isFocused ||
      activeHero.id !== dogId ||
      activeHero.phase !== "reverse" ||
      !activeHero.handoffPending
    ) {
      return;
    }

    const runId = activeHero.runId;
    let cancelled = false;
    markHeroSourceFocused({ id: dogId, runId });
    const animationFrame = requestAnimationFrame(() => {
      pictureRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        acknowledgeHeroSourceFrame({
          id: dogId,
          runId,
          role: "photo",
          frame: { x, y, width, height, borderRadius: Math.min(width, height) / 2 },
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [activeHero, dogId, isFocused]);

  const openDogProfile = () => {
    if (!forwardFlight.begin()) return;

    const cancelPendingOpening = () => {
      navigationWatchdogRef.current?.cancel();
      navigationWatchdogRef.current = null;
      forwardFlight.fail();
      if (ownedForwardRunRef.current !== null) {
        releaseHeroSourceOwnership({
          id: dogId,
          sourceKind: "chat",
          forwardRunId: ownedForwardRunRef.current,
        });
        ownedForwardRunRef.current = null;
      }
      setHeroSourceOpening(dogId, false);
    };
    setHeroSourceOpening(dogId, true, cancelPendingOpening);

    // Keep the destination's exact query hot even if this already-rendered
    // header outlives React Query's cache window.
    try {
      getTrcpContext().dog.get.setData({ id: dogId }, dog);
    } catch (error) {
      cancelPendingOpening();
      throw error;
    }

    const navigate = (heroTransition?: string, heroRunId?: number) => {
      try {
        setHeroSourceOpening(dogId, false);
        navigationWatchdogRef.current = null;
        forwardFlight.markNavigated();
        router.push({
          pathname: `${SceneName.Profile}/[id]`,
          params: {
            matchId,
            id: dogId,
            heroPhotoGeneration: 1,
            ...(heroTransition !== undefined && { heroTransition }),
            ...(heroTransition === "1" &&
              heroRunId !== undefined && {
                heroSceneTransition: "1",
                heroRunId: String(heroRunId),
              }),
          },
        });
      } catch (error) {
        setHeroSourceOpening(dogId, false);
        forwardFlight.fail();
        throw error;
      }
    };
    const finishNavigation = createHeroNavigationWatchdog(navigate);
    navigationWatchdogRef.current = finishNavigation;

    if (reduceMotion || screenReaderEnabled) {
      finishNavigation();
      return;
    }

    if (!pictureRef.current || !dog.images[0]?.url) {
      finishNavigation();
      return;
    }

    pictureRef.current.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        finishNavigation();
        return;
      }

      finishNavigation(() => {
        let startedRunId: number | null = null;
        let accepted = true;
        startedRunId = startHero({
          id: dogId,
          source: {
            uri: dog.images[0]?.url,
            blurhash: dog.images[0]?.blurhash,
          },
          sourceKind: "chat",
          sourceImageKey: dog.images[0]?.id ?? dog.images[0]!.url!,
          sourcePhotoGeneration: 1,
          from: { x, y, width, height, borderRadius: Math.min(width, height) / 2 },
          chrome: { dog, pages: dog.images.length, currentPage: 0 },
          cardSurface: true,
          topSurfaceFromOpacity: 0,
          topSurfaceToOpacity: 1,
          onReady: () => navigate("1", startedRunId ?? undefined),
          onPaintFailure: () => {
            if (ownedForwardRunRef.current === startedRunId) {
              ownedForwardRunRef.current = null;
            }
            navigate();
          },
          onUnsafeHandoff: () => router.setParams({ heroTransition: "0" }),
          onCancel: (reason) => {
            accepted = false;
            if (ownedForwardRunRef.current === startedRunId) {
              ownedForwardRunRef.current = null;
            }
            const hadNavigated = forwardFlight.status() === "navigated";
            cancelPendingOpening();
            if (hadNavigated && (reason === "readiness-timeout" || reason === "superseded")) {
              router.setParams({ heroTransition: "0" });
            }
          },
        });
        if (accepted) ownedForwardRunRef.current = startedRunId;
      });
    });
  };

  return (
    <S.PressableAreaFlex
      accessibilityRole="button"
      accessibilityLabel={t("dogProfile.openProfile", { name: dog.name })}
      accessibilityElementsHidden={profileInteractionLocked}
      importantForAccessibility={profileInteractionLocked ? "no-hide-descendants" : "auto"}
      disabled={profileInteractionLocked}
      onPress={openDogProfile}
    >
      <S.ProfileInfoContainer>
        <S.Picture
          ref={pictureRef}
          style={hideRealPhoto ? { opacity: 0 } : undefined}
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
  const { t } = useTranslation();

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
      <S.BackTouchArea
        testID="chat-back"
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        onPress={() => router.back()}
      >
        <BackArrow height={15} width={15} fill={theme.colors.text} />
      </S.BackTouchArea>
      <NetworkBoundary errorFallback={DogProfileError} suspenseFallback={<DogProfileInfoLoading />}>
        <DogProfileInfo dogId={dogId as string} matchId={matchId as string} />
      </NetworkBoundary>
    </S.Header>
  );
};

export default Header;
