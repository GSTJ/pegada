import { useEffect, useState } from "react";
import * as React from "react";
import { Alert, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { runOnJS, useAnimatedReaction } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import MainCard from "@/components/MainCard";
import { useHeroMotionProgress, useHeroRecoveryProgress } from "@/components/HeroTransition/motion";
import {
  isSwipeSurfaceHeroLocked,
  useHeroState,
} from "@/components/HeroTransition/store";
import { MatchActionBar } from "@/components/MatchActionBar";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { getTrcpContext } from "@/contexts/trcpContext";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useScreenReaderEnabled } from "@/hooks/useScreenReaderEnabled";
import { sendError } from "@/services/errorTracking";
import { useGetFormattedYears } from "@/services/useGetFormattedYears";
import { useIsSwipeActionInFlight } from "@/store/swipeActionFlight";
import { SceneName } from "@/types/SceneName";
import { useCustomTopInset } from "@/views/(tabs)/Swipe";
import { Swipe } from "@/store/swipeTypes";
import { BreedTag } from "@/views/DogProfile/components/BreedTag";
import GoBack from "@/views/DogProfile/components/GoBack";
import ProfileErrorState from "@/views/DogProfile/components/ProfileErrorState";
import ProfileFooterActions from "@/views/DogProfile/components/ProfileFooterActions";
import { createPendingExitCoordinator } from "@/views/DogProfile/exitCoordinator";
import { useProfileExitController } from "@/views/DogProfile/hooks/useProfileExitController";
import { useProfileSwipeActions } from "@/views/DogProfile/hooks/useProfileSwipeActions";
import { useProfileHeroPresentation } from "@/views/DogProfile/hooks/useProfileHeroPresentation";
import { useProfileHeroTargets } from "@/views/DogProfile/hooks/useProfileHeroTargets";
import { useRenderedProfileDog } from "@/views/DogProfile/hooks/useRenderedProfileDog";
import { useProfileRouteHeroOwnership } from "@/views/DogProfile/hooks/useProfileRouteHeroOwnership";
import { useProfileScenePresentation } from "@/views/DogProfile/hooks/useProfileScenePresentation";
import { useProfileReverseRemoval } from "@/views/DogProfile/hooks/useProfileReverseRemoval";
import * as S from "./styles";

const AnimatedGoBack = Animated.createAnimatedComponent(GoBack);

const DogProfile = () => {
  const {
    id,
    currentImageIndex = 0,
    heroPhotoGeneration = "1",
    heroSceneTransition,
    heroPhotoSessionToken,
    matchId,
    profileSource,
    swipeSessionId,
  } = useLocalSearchParams<{
    id: string;
    currentImageIndex?: string;
    heroPhotoGeneration?: string;
    heroTransition?: string;
    heroSceneTransition?: string;
    heroPhotoSessionToken?: string;
    matchId?: string;
    profileSource?: string;
    swipeSessionId?: string;
  }>();
  const { t, i18n: translation } = useTranslation();
  const getFormattedYears = useGetFormattedYears();

  const insets = useSafeAreaInsets();
  const topInset = useCustomTopInset();
  const router = useRouter();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const screenReaderEnabled = useScreenReaderEnabled();
  const activeHero = useHeroState();
  const heroProgress = useHeroMotionProgress();
  const recovery = useHeroRecoveryProgress();
  const usesHeroScene = heroSceneTransition === "1";
  const routeHeroSourceKind = heroPhotoSessionToken ? "swipe" : "chat";
  const matchingHeroActive = activeHero.id === id && activeHero.phase !== null;
  const {
    getForwardRunId,
    hasExactOwnership: hasExactRouteHeroOwnership,
    release: releaseRouteHeroOwnership,
  } = useProfileRouteHeroOwnership({
    heroPhotoSessionToken,
    id,
    isFocused,
    sourceKind: routeHeroSourceKind,
    usesHeroScene,
  });
  const {
    allowAndroidRemovalRef,
    deferRemoval: deferReverseRemoval,
    markSceneRemoving,
    sceneRemoving: reverseSceneRemoving,
  } = useProfileReverseRemoval();
  const { fallbackPastMidpoint, holdsCompletedReverseScene, sceneSettled, sceneStyle } =
    useProfileScenePresentation({
      activeHero,
      heroProgress,
      id,
      matchingHeroActive,
      onReverseFallbackComplete: markSceneRemoving,
      reverseSceneRemoving,
      usesHeroScene,
    });
  const swipeActionInFlight = useIsSwipeActionInFlight();
  const [unmatchLoading, setUnmatchLoading] = useState(false);
  const unmatchMutationOwnedRef = React.useRef(false);
  const unmatchExitCoordinator = React.useRef(createPendingExitCoordinator()).current;
  const [pendingUnmatchExitRevision, setPendingUnmatchExitRevision] = useState(0);
  const isUnmatchBlockingIntent = React.useCallback(
    (intent: unknown) =>
      (unmatchMutationOwnedRef.current || unmatchExitCoordinator.status() === "pending") &&
      !unmatchExitCoordinator.isRequestIntent(intent),
    [unmatchExitCoordinator],
  );
  const isUnmatchOwnedOrPending = React.useCallback(
    () => unmatchMutationOwnedRef.current || unmatchExitCoordinator.status() === "pending",
    [unmatchExitCoordinator],
  );
  const {
    appStateStatus,
    fallbackPendingExit,
    handleHeroContentChange,
    isReturningToTop,
    profileScrollOffset,
    profileScrollRef,
    requestExit,
    returningToTop,
  } = useProfileExitController({
    activeHeroVersion: activeHero.version,
    allowAndroidRemovalRef,
    deferReverseRemoval,
    hasExactRouteHeroOwnership,
    heroPhotoSessionToken,
    heroProgress,
    holdsCompletedReverseScene,
    id,
    isFocused,
    isUnmatchBlockingIntent,
    isUnmatchOwnedOrPending,
    reduceMotion,
    releaseRouteHeroOwnership,
    sceneSettled,
    screenReaderEnabled,
    swipeActionInFlight,
    unmatchLoading,
    usesHeroScene,
  });

  const profileStatusContentThreshold = Math.max(
    8,
    S.CARD_HEIGHT - Math.max(insets.top, theme.spacing[6]),
  );
  const [contentUnderStatusBar, setContentUnderStatusBar] = useState(false);
  useAnimatedReaction(
    () => profileScrollOffset.value >= profileStatusContentThreshold,
    (next, previous) => {
      if (next !== previous) runOnJS(setContentUnderStatusBar)(next);
    },
    [profileStatusContentThreshold],
  );

  const sourceStatusStyle = theme.dark ? "light" : "dark";
  const sceneInteractionLocked =
    matchingHeroActive ||
    holdsCompletedReverseScene ||
    (usesHeroScene && !sceneSettled) ||
    swipeActionInFlight ||
    unmatchLoading ||
    returningToTop;
  const profileSwipeActions = useProfileSwipeActions({
    dogId: id,
    profileSource,
    requestExit,
    swipeSessionId,
  });
  const e2eInteractionDebug = JSON.stringify({
    heroId: activeHero.id,
    heroPhase: activeHero.phase,
    matchingHeroActive,
    returningToTop,
    sceneSettled,
    swipeActionInFlight,
    swipeHeroLocked: isSwipeSurfaceHeroLocked(),
  });

  const matchActionBarHeight = topInset + 100;

  const handleUnmatch = async () => {
    if (unmatchMutationOwnedRef.current || unmatchExitCoordinator.status() !== "idle") return;
    unmatchMutationOwnedRef.current = true;
    setUnmatchLoading(true);
    try {
      await getTrcpContext().client.swipe.swipe.mutate({
        id: id as string,
        swipeType: Swipe.Dislike,
      });

      getTrcpContext().match.getAll.setData(undefined, (request) => {
        if (!request) return [];
        return request.filter((match) => match.dog.id !== id);
      });

      unmatchExitCoordinator.queue(() => router.dismissTo(SceneName.Messages));
      setPendingUnmatchExitRevision((revision) => revision + 1);
    } catch (err) {
      unmatchMutationOwnedRef.current = false;
      setUnmatchLoading(false);
      sendError(err);

      Alert.alert(t("dogProfile.somethingWrong"), t("dogProfile.tryAgainLater"));
    }
  };

  useEffect(() => {
    if (unmatchExitCoordinator.status() !== "pending") return;
    unmatchExitCoordinator.attempt((postHandoff, requestIntent) =>
      requestExit(postHandoff, undefined, requestIntent),
    );
  }, [
    activeHero.phase,
    appStateStatus,
    isFocused,
    pendingUnmatchExitRevision,
    requestExit,
    sceneSettled,
    swipeActionInFlight,
    unmatchExitCoordinator,
  ]);

  const dog = useRenderedProfileDog({
    activeHero,
    fallbackPendingExit,
    getForwardRunId,
    heroPhotoSessionToken,
    id,
    isFocused,
    isReturningToTop,
    locale: translation.language,
    swipeActionInFlight,
    topInset,
  });

  const { goBackRecoveryStyle, profileDescriptionHeroStyle, targetRecoveryStyle } =
    useProfileHeroPresentation({
      activeHero,
      heroProgress,
      id,
      matchingHeroActive,
      recovery,
    });
  const {
    goBackRef,
    hideProfileSharedSurface,
    hideProfileTitle,
    hideRealGoBack,
    onGoBackLayout,
    onTitleLayout,
    titleAnchorRef,
  } = useProfileHeroTargets(id, activeHero);

  const handleOpenFakeMatch = React.useCallback(() => {
    if (!matchId) return;
    router.push({
      pathname: SceneName.NewMatch,
      params: { matchDogId: dog.id, matchId },
    });
  }, [dog.id, matchId, router]);

  const mainCardStyle = {
    paddingTop: Math.max(insets.top, theme.spacing[6]),
    borderRadius: 0,
    height: S.CARD_HEIGHT,
  };

  return (
    <S.Scene
      style={sceneStyle}
      pointerEvents={sceneInteractionLocked ? "none" : "auto"}
      accessible={false}
      accessibilityElementsHidden={sceneInteractionLocked}
      importantForAccessibility={sceneInteractionLocked ? "no-hide-descendants" : "auto"}
    >
      {!matchingHeroActive ? (
        <StatusBar
          animated={false}
          style={
            holdsCompletedReverseScene
              ? sourceStatusStyle
              : sceneSettled || fallbackPastMidpoint
                ? contentUnderStatusBar
                  ? sourceStatusStyle
                  : "light"
                : sourceStatusStyle
          }
        />
      ) : null}
      <S.Container ref={profileScrollRef} scrollEventThrottle={16}>
        <View style={{ backgroundColor: theme.colors.black }}>
          <MainCard
            startImageIndex={Number(currentImageIndex)}
            startPhotoGeneration={Number(heroPhotoGeneration)}
            shouldShowPersonalInfo={false}
            onHeroContentChange={handleHeroContentChange}
            heroPhotoSessionToken={heroPhotoSessionToken}
            style={[mainCardStyle, hideProfileSharedSurface ? { opacity: 0 } : undefined]}
            dog={dog}
          />
        </View>

        <AnimatedGoBack
          ref={goBackRef}
          testID="dog-profile-close"
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onLayout={onGoBackLayout}
          onPress={() => requestExit()}
          style={[hideRealGoBack ? { opacity: 0 } : undefined, goBackRecoveryStyle]}
        />

        <S.BottomColumn
          style={{
            paddingBottom: matchId ? theme.spacing[8] : matchActionBarHeight,
          }}
        >
          <S.Content>
            <BreedTag breed={dog.breed} />
            <Animated.View
              ref={titleAnchorRef}
              collapsable={false}
              onLayout={onTitleLayout}
              style={[hideProfileTitle ? { opacity: 0 } : undefined, targetRecoveryStyle]}
            >
              <S.Name
                testID="dog-profile-name"
                accessibilityLabel={e2eInteractionDebug}
                accessibilityHint={e2eInteractionDebug}
                numberOfLines={1}
              >
                {dog.name}
                {dog.birthDate ? <S.Age>, {getFormattedYears(dog.birthDate)}</S.Age> : undefined}
              </S.Name>
            </Animated.View>
            <View style={{ gap: theme.spacing[7] }}>
              <Animated.View style={profileDescriptionHeroStyle}>
                <S.Description>{dog.bio}</S.Description>
              </Animated.View>
              <ProfileFooterActions
                dog={dog}
                matchId={matchId}
                onOpenFakeMatch={handleOpenFakeMatch}
                onUnmatch={handleUnmatch}
                unmatchLoading={unmatchLoading}
              />
            </View>
          </S.Content>
        </S.BottomColumn>
      </S.Container>

      {!matchId && (
        <>
          <S.MatchActionBarGradient style={{ height: matchActionBarHeight + theme.spacing[8] }} />
          <MatchActionBar
            sharedDogId={id}
            sharedRole="target"
            style={{ bottom: topInset }}
            onNope={profileSwipeActions.handleNope}
            onYep={profileSwipeActions.handleYep}
            onMaybe={profileSwipeActions.handleMaybe}
          />
        </>
      )}
    </S.Scene>
  );
};

export default () => (
  <NetworkBoundary errorFallback={ProfileErrorState}>
    <DogProfile />
  </NetworkBoundary>
);
