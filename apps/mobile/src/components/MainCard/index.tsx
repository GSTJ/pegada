import type { SwipeDog } from "@/store/reducers/dogs/swipe";
import { useCallback, useEffect, useRef, useState } from "react";
import * as React from "react";
import { View } from "react-native";
import {
  cancelAnimation,
  runOnJS,
  runOnUI,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useTheme } from "styled-components/native";

import {
  acknowledgeHeroTargetFrame,
  acknowledgeHeroSourceFrame,
  advanceHeroPhotoRenderState,
  abandonHero,
  beginHeroPhotoSession,
  cancelHeroSourceOpening,
  createHeroPhotoSourceInstanceToken,
  createHeroForwardFlight,
  createHeroNavigationWatchdog,
  endHeroPhotoSession,
  getHeroPhotoEntrySnapshot,
  getHeroSourceActionFrame,
  invalidateHeroForContentChange,
  invalidateHeroPhotoSession,
  getHeroPhotoRenderKey,
  isSwipeSurfaceHeroLocked,
  isHeroPhotoMutationAllowed,
  markHeroSourcePhotoPainted,
  markHeroSourceFocused,
  markHeroTargetPhotoPainted,
  registerHeroTargetFrame,
  reconcileHeroPhotoRenderState,
  releaseHeroPhotoSourceInstance,
  setHeroSourceOpening,
  shouldHideHeroEndpointPhoto,
  startHero,
  updateHeroPhotoSelection,
  type HeroPhotoSessionToken,
  type HeroFrame,
  type HeroBottomSurfaceLocations,
  useHeroState,
  useIsHeroInteractionLocked,
  useIsHeroSourceOpening,
  useIsSwipeSurfaceHeroLocked,
} from "@/components/HeroTransition/store";
import { HERO_MORPH_DURATION } from "@/components/HeroTransition/motion";
import { SWIPE_CARD_HERO_SHADOW } from "@/components/MainCard/heroShadow";
import { PressableArea } from "@/components/PressableArea";
import { getTrcpContext } from "@/contexts/trcpContext";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useScreenReaderEnabled } from "@/hooks/useScreenReaderEnabled";
import { useGetFormattedYears } from "@/services/useGetFormattedYears";
import type { RootReducer } from "@/store/reducers";
import { SceneName } from "@/types/SceneName";
import {
  beginSwipeActionFlight,
  endSwipeActionFlight,
  getIsSwipeActionInFlight,
  type SwipeActionFlightToken,
  useIsSwipeActionInFlight,
} from "@/store/swipeActionFlight";
import Distance from "./components/Distance";
import Pagination from "./components/Pagination";
import PersonalInfo, { BIO_NUMBER_OF_LINES } from "./components/PersonalInfo";
import {
  CarouselContainer,
  Container,
  NextImage,
  PhotoAnchor,
  Picture,
  PreviousImage,
  UpperPart,
} from "./styles";

const springConfig = { mass: 0.2 };
const BOUNDARY_TILT_WATCHDOG_MS = 1_200;

const START_IMAGE_INDEX = 0;

export interface VisitingCardProps extends React.ComponentProps<typeof Container> {
  dog: SwipeDog;
  shouldShowPersonalInfo?: boolean;
  startImageIndex?: number;
  startPhotoGeneration?: number;
  onHeroContentChange?: () => void;
  heroPhotoSessionToken?: HeroPhotoSessionToken;
  tiltRotation?: SharedValue<number>;
}

const VisitingCard: React.FC<VisitingCardProps> = ({
  dog,
  shouldShowPersonalInfo = true,
  startImageIndex = START_IMAGE_INDEX,
  startPhotoGeneration = 1,
  onHeroContentChange,
  heroPhotoSessionToken,
  tiltRotation,
  ...props
}) => {
  const { images = [] } = dog;
  const imagesRef = useRef(images);
  const previousImagesRef = useRef(images);
  const [photoState, setPhotoState] = useState({
    index: startImageIndex,
    generation: startPhotoGeneration,
  });
  const photoStateRef = useRef(photoState);
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const reduceMotion = useReduceMotion();
  const screenReaderEnabled = useScreenReaderEnabled();
  const getFormattedYears = useGetFormattedYears();
  const swipeSessionId = useSelector((state: RootReducer) => state.dogs.config.sessionId);
  const forwardFlight = useRef(createHeroForwardFlight()).current;
  const navigationWatchdogRef = useRef<ReturnType<typeof createHeroNavigationWatchdog> | null>(
    null,
  );
  const pendingOpeningSessionRef = useRef<HeroPhotoSessionToken | null>(null);
  const ownedForwardRunRef = useRef<number | null>(null);
  const boundaryTiltTokenRef = useRef<SwipeActionFlightToken | null>(null);
  const boundaryTiltReleaseFrameRef = useRef<number | null>(null);
  const boundaryTiltWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const internalRotation = useSharedValue(0);
  const rotation = tiltRotation ?? internalRotation;
  const usesExternalTilt = Boolean(tiltRotation);

  // When rendered inside DogProfile (no personal info), this card is the hero
  // *destination*; on the swipe deck it's the *source*.
  const isHeroDestination = !shouldShowPersonalInfo;
  const photoAnchorRef = useRef<View>(null);
  const chromeAnchorRef = useRef<View>(null);
  const personalInfoAnchorRef = useRef<View>(null);
  const titleAnchorRef = useRef<View>(null);
  const bioAnchorRef = useRef<View>(null);
  const sourceInstanceToken = useRef(createHeroPhotoSourceInstanceToken()).current;
  const sourcePhotoGeneration = useRef(startPhotoGeneration);
  let renderedPhotoState = photoState;
  if (previousImagesRef.current !== images && isHeroPhotoMutationAllowed()) {
    const reconciledPhotoState = reconcileHeroPhotoRenderState(
      photoStateRef.current,
      previousImagesRef.current,
      images,
    );
    previousImagesRef.current = images;
    if (
      reconciledPhotoState.index !== photoState.index ||
      reconciledPhotoState.generation !== photoState.generation
    ) {
      renderedPhotoState = reconciledPhotoState;
      setPhotoState(reconciledPhotoState);
    }
  }
  imagesRef.current = images;
  photoStateRef.current = renderedPhotoState;
  sourcePhotoGeneration.current = renderedPhotoState.generation;
  const currentImage = renderedPhotoState.index;
  const interactionLocked = useIsHeroInteractionLocked(dog.id);
  const sourceOpening = useIsHeroSourceOpening(dog.id);
  const swipeHeroLocked = useIsSwipeSurfaceHeroLocked();
  const swipeActionInFlight = useIsSwipeActionInFlight();
  const activeHero = useHeroState();
  const lateTargetPhotoFadeRef = useRef<{ id: string; runId: number } | null>(null);
  if (
    isHeroDestination &&
    activeHero.id === dog.id &&
    activeHero.phase === "forward" &&
    activeHero.forwardRecoveryKind === "placeholder"
  ) {
    lateTargetPhotoFadeRef.current = { id: dog.id, runId: activeHero.runId };
  }
  const shouldFadeLateTargetPhoto =
    isHeroDestination && lateTargetPhotoFadeRef.current?.id === dog.id;
  const hideRealPhoto = shouldHideHeroEndpointPhoto(
    activeHero,
    dog.id,
    !isHeroDestination,
    "swipe",
  );
  const overlayOwnsSharedEndpoint = hideRealPhoto;
  const hideSourceBio = Boolean(
    !isHeroDestination &&
    overlayOwnsSharedEndpoint &&
    activeHero.sourceBio &&
    activeHero.id === dog.id,
  );
  const destinationHeroRunId =
    isHeroDestination && activeHero.id === dog.id && activeHero.phase === "forward"
      ? activeHero.runId
      : 0;
  const destinationHeroHandoffRunId =
    destinationHeroRunId && activeHero.handoffPending ? destinationHeroRunId : 0;
  const hideSharedChrome = Boolean(overlayOwnsSharedEndpoint && activeHero.chrome);
  const sourceInteractionLocked = !isHeroDestination && sourceOpening;
  const cardInteractionLocked =
    interactionLocked || sourceInteractionLocked || swipeHeroLocked || swipeActionInFlight;

  const currentPhoto = images[currentImage];
  const renderedPhotoGeneration = photoState.generation;
  const renderedPhotoRef = useRef({
    imageKey: currentPhoto?.id ?? currentPhoto?.url,
    uri: currentPhoto?.url,
    generation: renderedPhotoGeneration,
  });
  renderedPhotoRef.current = {
    imageKey: currentPhoto?.id ?? currentPhoto?.url,
    uri: currentPhoto?.url,
    generation: renderedPhotoGeneration,
  };
  const heroContentInvalidated = useRef(false);

  const clearBoundaryTiltWatchdog = useCallback(() => {
    if (boundaryTiltWatchdogRef.current !== null) {
      clearTimeout(boundaryTiltWatchdogRef.current);
    }
    boundaryTiltWatchdogRef.current = null;
  }, []);

  const finishBoundaryTilt = useCallback(
    (token: SwipeActionFlightToken) => {
      if (!mountedRef.current || boundaryTiltTokenRef.current !== token) return;
      if (boundaryTiltReleaseFrameRef.current !== null) {
        cancelAnimationFrame(boundaryTiltReleaseFrameRef.current);
      }
      boundaryTiltReleaseFrameRef.current = requestAnimationFrame(() => {
        boundaryTiltReleaseFrameRef.current = null;
        if (!mountedRef.current || boundaryTiltTokenRef.current !== token) return;
        // Keep the watchdog alive through the first canonical painted frame.
        // If this RAF is deferred/lost or exact release fails, its next tick
        // settles at zero and retries without touching a newer token.
        if (!endSwipeActionFlight(token)) return;
        boundaryTiltTokenRef.current = null;
        clearBoundaryTiltWatchdog();
      });
    },
    [clearBoundaryTiltWatchdog],
  );

  const settleBoundaryTiltAtRest = (token: SwipeActionFlightToken) => {
    "worklet";
    cancelAnimation(rotation);
    rotation.value = withSpring(0, springConfig, (finished) => {
      if (finished) runOnJS(finishBoundaryTilt)(token);
    });
  };

  const armBoundaryTiltWatchdog = useCallback(
    (token: SwipeActionFlightToken) => {
      const scheduleRecovery = () => {
        if (!mountedRef.current || boundaryTiltTokenRef.current !== token) return;
        clearBoundaryTiltWatchdog();
        boundaryTiltWatchdogRef.current = setTimeout(() => {
          boundaryTiltWatchdogRef.current = null;
          if (!mountedRef.current || boundaryTiltTokenRef.current !== token) return;
          // Re-arm before crossing to the UI thread. A lost/interrupted recovery
          // callback can retry, but an old token can never touch a newer tilt.
          scheduleRecovery();
          runOnUI(settleBoundaryTiltAtRest)(token);
        }, BOUNDARY_TILT_WATCHDOG_MS);
      };
      scheduleRecovery();
    },
    [clearBoundaryTiltWatchdog, settleBoundaryTiltAtRest],
  );

  const startBoundaryTilt = useCallback(
    (degrees: number) => {
      if (boundaryTiltTokenRef.current) return;
      const token = beginSwipeActionFlight(dog.id);
      if (!token) return;
      boundaryTiltTokenRef.current = token;
      armBoundaryTiltWatchdog(token);
      rotation.value = withSequence(
        withSpring(degrees, springConfig),
        withSpring(0, springConfig, (finished) => {
          if (finished) runOnJS(finishBoundaryTilt)(token);
        }),
      );
    },
    [armBoundaryTiltWatchdog, dog.id, finishBoundaryTilt, rotation],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelAnimation(rotation);
      clearBoundaryTiltWatchdog();
      if (boundaryTiltReleaseFrameRef.current !== null) {
        cancelAnimationFrame(boundaryTiltReleaseFrameRef.current);
        boundaryTiltReleaseFrameRef.current = null;
      }
      const token = boundaryTiltTokenRef.current;
      boundaryTiltTokenRef.current = null;
      endSwipeActionFlight(token);
    };
  }, [clearBoundaryTiltWatchdog, rotation]);

  useEffect(() => {
    forwardFlight.onSourceFocusChange(isFocused);
    if (!isFocused && forwardFlight.status() === "measuring") {
      cancelHeroSourceOpening(dog.id);
    }
  }, [dog.id, forwardFlight, isFocused]);

  useEffect(() => {
    if (isHeroDestination) return;
    return () => {
      navigationWatchdogRef.current?.cancel();
      navigationWatchdogRef.current = null;
      if (ownedForwardRunRef.current !== null) {
        abandonHero(dog.id, ownedForwardRunRef.current);
        ownedForwardRunRef.current = null;
      }
      setHeroSourceOpening(dog.id, false);
      endHeroPhotoSession(pendingOpeningSessionRef.current);
      pendingOpeningSessionRef.current = null;
      releaseHeroPhotoSourceInstance(sourceInstanceToken);
    };
  }, [dog.id, isHeroDestination, sourceInstanceToken]);

  useEffect(() => {
    if (
      isHeroDestination ||
      !isFocused ||
      activeHero.id !== dog.id ||
      activeHero.phase !== "reverse" ||
      !activeHero.handoffPending
    ) {
      return;
    }

    const runId = activeHero.runId;
    let cancelled = false;
    markHeroSourceFocused({ id: dog.id, runId });
    const animationFrame = requestAnimationFrame(() => {
      photoAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        acknowledgeHeroSourceFrame({
          id: dog.id,
          runId,
          role: "photo",
          frame: { x, y, width, height, borderRadius: theme.radii.lg },
        });
      });
      chromeAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        acknowledgeHeroSourceFrame({
          id: dog.id,
          runId,
          role: "chrome",
          frame: { x, y, width, height },
        });
      });
      titleAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        acknowledgeHeroSourceFrame({
          id: dog.id,
          runId,
          role: "title",
          frame: { x, y, width, height },
        });
      });
      bioAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        acknowledgeHeroSourceFrame({
          id: dog.id,
          runId,
          role: "bio",
          frame: { x, y, width, height },
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [activeHero, dog.id, isFocused, isHeroDestination, theme.radii.lg]);

  const openUserProfile = () => {
    if (getIsSwipeActionInFlight() || isSwipeSurfaceHeroLocked()) return;
    if (!forwardFlight.begin()) return;

    const cancelPendingOpening = () => {
      navigationWatchdogRef.current?.cancel();
      navigationWatchdogRef.current = null;
      const pendingSession = pendingOpeningSessionRef.current;
      pendingOpeningSessionRef.current = null;
      forwardFlight.fail();
      if (ownedForwardRunRef.current !== null) {
        abandonHero(dog.id, ownedForwardRunRef.current);
        ownedForwardRunRef.current = null;
      }
      setHeroSourceOpening(dog.id, false);
      endHeroPhotoSession(pendingSession);
    };
    setHeroSourceOpening(dog.id, true, cancelPendingOpening);

    const entryPhotoState = getHeroPhotoEntrySnapshot(photoStateRef.current, imagesRef.current);
    const entryImageIndex = entryPhotoState.index;
    const entryPhotoGeneration = entryPhotoState.generation;
    const entryPhoto = entryPhotoState.photo;
    const entryImageKey = entryPhoto?.id ?? entryPhoto?.url;
    const photoSessionToken =
      entryPhoto?.url && entryImageKey
        ? beginHeroPhotoSession({
            id: dog.id,
            sourceInstanceToken,
            index: entryImageIndex,
            imageKey: entryImageKey,
            generation: entryPhotoGeneration,
            source: { uri: entryPhoto.url, blurhash: entryPhoto.blurhash },
            applySourceSelection: (_index, imageKey) => {
              const exactIndex = imagesRef.current.findIndex(
                (image) => (image.id ?? image.url) === imageKey,
              );
              if (exactIndex < 0) return null;
              const nextPhotoState = advanceHeroPhotoRenderState(
                exactIndex,
                sourcePhotoGeneration.current,
              );
              sourcePhotoGeneration.current = nextPhotoState.generation;
              // Index and native-image generation are one atomic render state.
              // A hidden A→B→A can be React-batched back to index 0; generation
              // 3 still changes, forcing A:g3 to mount and emit its own paint.
              photoStateRef.current = nextPhotoState;
              setPhotoState(nextPhotoState);
              return nextPhotoState;
            },
          })
        : undefined;
    pendingOpeningSessionRef.current = photoSessionToken ?? null;

    // The swipe response already contains the complete DogProfile payload.
    // Refresh the exact query key at the interaction boundary so an entry
    // that has aged out of React Query never suspends between the card and
    // the hero destination.
    try {
      getTrcpContext().dog.get.setData({ id: dog.id }, dog);
    } catch (error) {
      cancelPendingOpening();
      throw error;
    }

    const navigate = (heroTransition?: string, heroRunId?: number) => {
      try {
        setHeroSourceOpening(dog.id, false);
        navigationWatchdogRef.current = null;
        pendingOpeningSessionRef.current = null;
        forwardFlight.markNavigated();
        router.push({
          pathname: `${SceneName.Profile}/[id]`,
          params: {
            id: dog.id,
            currentImageIndex: entryImageIndex,
            heroPhotoGeneration: entryPhotoGeneration,
            heroTransition,
            profileSource: "swipe",
            swipeSessionId: String(swipeSessionId),
            ...(heroTransition === "1" &&
              heroRunId !== undefined && {
                heroSceneTransition: "1",
                heroRunId: String(heroRunId),
              }),
            heroPhotoSessionToken: photoSessionToken,
          },
        });
      } catch (error) {
        setHeroSourceOpening(dog.id, false);
        endHeroPhotoSession(photoSessionToken);
        pendingOpeningSessionRef.current = null;
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

    // Kick off the manual hero morph: freeze the tapped photo into a flying
    // overlay measured at its on-screen frame, then navigate. The destination
    // card reports its frame on mount (see onDestinationLayout) and the
    // overlay animates between the two. See @/components/HeroTransition/store.
    let photoFrame: HeroFrame | null = null;
    let chromeFrame: HeroFrame | null = null;
    let personalInfoFrame: HeroFrame | null = null;
    let titleFrame: HeroFrame | null = null;
    let bioFrame: HeroFrame | null = null;
    let photoMeasured = false;
    let chromeMeasured = false;
    let personalInfoMeasured = false;
    let titleMeasured = false;
    let bioMeasured = !dog.bio;

    const finishWhenMeasured = () => {
      if (
        !photoMeasured ||
        !chromeMeasured ||
        !personalInfoMeasured ||
        !titleMeasured ||
        !bioMeasured
      ) {
        return;
      }
      const measuredPhotoFrame = photoFrame;
      const measuredChromeFrame = chromeFrame;
      const measuredPersonalInfoFrame = personalInfoFrame;
      const measuredTitleFrame = titleFrame;
      const measuredBioFrame = bioFrame;
      const heroPhoto = entryPhoto;
      const sourceActionFrame = getHeroSourceActionFrame(dog.id);
      if (
        !measuredPhotoFrame ||
        !measuredChromeFrame ||
        !measuredPersonalInfoFrame ||
        !measuredTitleFrame ||
        measuredTitleFrame.height > 40 ||
        (dog.bio ? !measuredBioFrame : false) ||
        !sourceActionFrame ||
        !heroPhoto?.url
      ) {
        finishNavigation();
        return;
      }

      finishNavigation(() => {
        let bottomSurfaceLocations: HeroBottomSurfaceLocations | undefined;
        if (measuredPersonalInfoFrame && measuredPhotoFrame.height > 0) {
          const clampUnit = (value: number) => Math.max(0, Math.min(1, value));
          const start = clampUnit(
            (measuredPersonalInfoFrame.y - measuredPhotoFrame.y) / measuredPhotoFrame.height,
          );
          const end = clampUnit(
            (measuredPersonalInfoFrame.y +
              measuredPersonalInfoFrame.height -
              measuredPhotoFrame.y) /
              measuredPhotoFrame.height,
          );
          bottomSurfaceLocations = [0, start, start + (end - start) / 2, end];
        }
        let startedRunId: number | null = null;
        let accepted = true;
        startedRunId = startHero({
          id: dog.id,
          source: { uri: heroPhoto.url, blurhash: heroPhoto.blurhash },
          sourceKind: "swipe",
          sourceImageKey: heroPhoto.id ?? heroPhoto.url,
          sourcePhotoGeneration: entryPhotoGeneration,
          photoSessionToken,
          from: measuredPhotoFrame,
          cardSurface: true,
          bottomSurfaceLocations,
          title: {
            name: dog.name,
            age: dog.birthDate ? (getFormattedYears(dog.birthDate) ?? null) : null,
          },
          titleFrom: measuredTitleFrame,
          ...(dog.bio && measuredBioFrame
            ? {
                sourceBio: { text: dog.bio, numberOfLines: BIO_NUMBER_OF_LINES },
                sourceBioFrame: measuredBioFrame,
              }
            : undefined),
          shadow: SWIPE_CARD_HERO_SHADOW,
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
          ...(measuredChromeFrame
            ? {
                chrome: {
                  dog,
                  pages: images.length,
                  currentPage: entryImageIndex,
                },
                chromeFrom: measuredChromeFrame,
              }
            : undefined),
        });
        if (accepted) ownedForwardRunRef.current = startedRunId;
      });
    };

    const photoAnchor = photoAnchorRef.current;
    if (photoAnchor) {
      photoAnchor.measureInWindow((x, y, width, height) => {
        photoMeasured = true;
        if (width > 0 && height > 0) {
          photoFrame = { x, y, width, height, borderRadius: theme.radii.lg };
        }
        finishWhenMeasured();
      });
    } else {
      photoMeasured = true;
    }

    const chromeAnchor = chromeAnchorRef.current;
    if (chromeAnchor) {
      chromeAnchor.measureInWindow((x, y, width, height) => {
        chromeMeasured = true;
        if (width > 0 && height > 0) chromeFrame = { x, y, width, height };
        finishWhenMeasured();
      });
    } else {
      chromeMeasured = true;
    }

    const personalInfoAnchor = personalInfoAnchorRef.current;
    if (personalInfoAnchor) {
      personalInfoAnchor.measureInWindow((x, y, width, height) => {
        personalInfoMeasured = true;
        if (width > 0 && height > 0) personalInfoFrame = { x, y, width, height };
        finishWhenMeasured();
      });
    } else {
      personalInfoMeasured = true;
    }

    const titleAnchor = titleAnchorRef.current;
    if (titleAnchor) {
      titleAnchor.measureInWindow((x, y, width, height) => {
        titleMeasured = true;
        if (width > 0 && height > 0) titleFrame = { x, y, width, height };
        finishWhenMeasured();
      });
    } else {
      titleMeasured = true;
    }

    if (dog.bio) {
      const bioAnchor = bioAnchorRef.current;
      if (bioAnchor) {
        bioAnchor.measureInWindow((x, y, width, height) => {
          bioMeasured = true;
          if (width > 0 && height > 0) bioFrame = { x, y, width, height };
          finishWhenMeasured();
        });
      } else {
        bioMeasured = true;
      }
    }

    finishWhenMeasured();
  };

  const onDestinationLayout = useCallback(() => {
    if (!isHeroDestination || !destinationHeroRunId) return;
    // Defer to the next frame so native layout has settled before we measure.
    requestAnimationFrame(() => {
      photoAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          const frame = { x, y, width, height, borderRadius: 0 };
          if (destinationHeroHandoffRunId) {
            acknowledgeHeroTargetFrame({
              id: dog.id,
              runId: destinationHeroHandoffRunId,
              role: "photo",
              frame,
            });
          } else {
            registerHeroTargetFrame({
              id: dog.id,
              runId: destinationHeroRunId,
              role: "photo",
              frame,
            });
          }
        }
      });
    });
  }, [destinationHeroHandoffRunId, destinationHeroRunId, dog.id, isHeroDestination]);

  const onDestinationChromeLayout = useCallback(() => {
    if (!isHeroDestination || !destinationHeroRunId) return;
    requestAnimationFrame(() => {
      chromeAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          const frame = { x, y, width, height };
          if (destinationHeroHandoffRunId) {
            acknowledgeHeroTargetFrame({
              id: dog.id,
              runId: destinationHeroHandoffRunId,
              role: "chrome",
              frame,
            });
          } else {
            registerHeroTargetFrame({
              id: dog.id,
              runId: destinationHeroRunId,
              role: "chrome",
              frame,
            });
          }
        }
      });
    });
  }, [destinationHeroHandoffRunId, destinationHeroRunId, dog.id, isHeroDestination]);

  useEffect(() => {
    if (!destinationHeroHandoffRunId) return;
    // This effect runs after the handoffPending commit, so these cannot be
    // pre-landing safe-area measurements accidentally promoted as final.
    onDestinationLayout();
    onDestinationChromeLayout();
  }, [destinationHeroHandoffRunId, onDestinationChromeLayout, onDestinationLayout]);

  const selectImage = (nextIndex: number) => {
    // Re-read the generic Hero owner at the actual mutation boundary. A Chat
    // photo press queued before Back must not change destination pixels after
    // reverse has synchronously claimed its exact snapshot.
    if (!isHeroPhotoMutationAllowed()) return;

    const nextPhoto = images[nextIndex];
    const nextImageKey = nextPhoto?.id ?? nextPhoto?.url;
    if (!nextPhoto?.url || !nextImageKey) return;

    if (isHeroDestination) {
      if (heroPhotoSessionToken) {
        // This synchronous store update rewrites the settled reverse snapshot
        // and the hidden source card before the visible profile state changes.
        const result = updateHeroPhotoSelection({
          id: dog.id,
          sessionToken: heroPhotoSessionToken,
          index: nextIndex,
          imageKey: nextImageKey,
          source: { uri: nextPhoto.url, blurhash: nextPhoto.blurhash },
        });
        if (result === "in-flight") return;
        if (result !== "synced") {
          if (result === "missing") {
            invalidateHeroPhotoSession({ id: dog.id, sessionToken: heroPhotoSessionToken });
          }
          onHeroContentChange?.();
        }
      } else if (!heroContentInvalidated.current) {
        // Chat/avatar entries keep first-image semantics. Paging opts out of
        // reverse geometry before the destination pixels change.
        heroContentInvalidated.current = true;
        invalidateHeroForContentChange(dog.id);
        onHeroContentChange?.();
      }
    }
    if (!isHeroDestination) {
      const nextPhotoState = advanceHeroPhotoRenderState(nextIndex, sourcePhotoGeneration.current);
      sourcePhotoGeneration.current = nextPhotoState.generation;
      photoStateRef.current = nextPhotoState;
      setPhotoState(nextPhotoState);
      return;
    }
    const nextPhotoState = { ...photoStateRef.current, index: nextIndex };
    photoStateRef.current = nextPhotoState;
    setPhotoState(nextPhotoState);
  };

  const gotoPreviousImage = () => {
    if (!isHeroPhotoMutationAllowed()) return;
    if (cardInteractionLocked || getIsSwipeActionInFlight() || isSwipeSurfaceHeroLocked()) return;
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage !== 0) return selectImage(currentImage - 1);

    if (reduceMotion || screenReaderEnabled) return;

    // eslint-disable-next-line react-compiler/react-compiler -- false positive
    startBoundaryTilt(-0.5);
  };

  const gotoNextImage = () => {
    if (!isHeroPhotoMutationAllowed()) return;
    if (cardInteractionLocked || getIsSwipeActionInFlight() || isSwipeSurfaceHeroLocked()) return;
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage + 1 < images.length) {
      return selectImage(currentImage + 1);
    }
    if (reduceMotion || screenReaderEnabled) return;
    startBoundaryTilt(0.5);
  };

  const transform = useAnimatedStyle(() => {
    "worklet";
    if (usesExternalTilt) return {};
    return {
      transform: [{ perspective: 100 }, { rotateY: `${rotation.value}deg` }],
    };
  });

  return (
    <Container testID="swipe-card" {...props} style={[props.style, transform]}>
      <PhotoAnchor
        ref={photoAnchorRef}
        onLayout={onDestinationLayout}
        // While the hero overlay is flying, hide the real photo so only the
        // overlay copy is visible (no double image). The overlay clears itself
        // once the morph lands, revealing this again.
        style={hideRealPhoto ? { opacity: 0 } : undefined}
        accessibilityElementsHidden={cardInteractionLocked}
        importantForAccessibility={cardInteractionLocked ? "no-hide-descendants" : "auto"}
      >
        <Picture
          source={{
            uri: currentPhoto?.url,
            blurhash: currentPhoto?.blurhash,
          }}
          transition={
            shouldFadeLateTargetPhoto ? (reduceMotion ? 0 : HERO_MORPH_DURATION) : undefined
          }
          key={getHeroPhotoRenderKey(
            currentPhoto?.id ?? currentPhoto?.url,
            renderedPhotoGeneration,
          )}
          onDisplay={() => {
            const imageKey = currentPhoto?.id ?? currentPhoto?.url;
            if (lateTargetPhotoFadeRef.current?.id === dog.id) {
              lateTargetPhotoFadeRef.current = null;
            }
            if (
              !isHeroDestination &&
              imageKey &&
              renderedPhotoRef.current.imageKey === imageKey &&
              renderedPhotoRef.current.uri === currentPhoto?.url &&
              renderedPhotoRef.current.generation === renderedPhotoGeneration
            ) {
              markHeroSourcePhotoPainted({
                id: dog.id,
                sourceInstanceToken,
                imageKey,
                uri: currentPhoto?.url,
                generation: renderedPhotoGeneration,
              });
            } else if (
              isHeroDestination &&
              destinationHeroRunId &&
              imageKey &&
              renderedPhotoRef.current.imageKey === imageKey &&
              renderedPhotoRef.current.uri === currentPhoto?.url &&
              renderedPhotoRef.current.generation === renderedPhotoGeneration
            ) {
              markHeroTargetPhotoPainted({
                id: dog.id,
                runId: destinationHeroRunId,
                imageKey,
                uri: currentPhoto?.url,
                generation: renderedPhotoGeneration,
              });
            }
          }}
        />
      </PhotoAnchor>
      <LinearGradient
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: overlayOwnsSharedEndpoint ? 0 : 1,
        }}
        accessible={false}
        colors={["rgba(0, 0, 0, .65)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]}
      />
      <UpperPart
        ref={chromeAnchorRef}
        onLayout={onDestinationChromeLayout}
        pointerEvents={hideSharedChrome || cardInteractionLocked ? "none" : "auto"}
        accessibilityElementsHidden={hideSharedChrome || cardInteractionLocked}
        importantForAccessibility={
          hideSharedChrome || cardInteractionLocked ? "no-hide-descendants" : "auto"
        }
        style={hideSharedChrome ? { opacity: 0 } : undefined}
      >
        <Distance dog={dog} />
        <Pagination pages={images.length} currentPage={currentImage} />
        <CarouselContainer>
          <PreviousImage
            accessibilityRole="button"
            accessibilityLabel={t("dogProfile.previousPhoto", { name: dog.name })}
            onPress={gotoPreviousImage}
          />
          <NextImage
            accessibilityRole="button"
            accessibilityLabel={t("dogProfile.nextPhoto", { name: dog.name })}
            onPress={gotoNextImage}
          />
        </CarouselContainer>
      </UpperPart>
      {Boolean(shouldShowPersonalInfo) && (
        <PressableArea
          testID="swipe-card-open-profile"
          accessibilityRole="button"
          accessibilityLabel={t("dogProfile.openProfile", { name: dog.name })}
          accessibilityElementsHidden={cardInteractionLocked}
          importantForAccessibility={cardInteractionLocked ? "no-hide-descendants" : "auto"}
          disabled={cardInteractionLocked}
          onPress={openUserProfile}
        >
          <View ref={personalInfoAnchorRef} collapsable={false}>
            <PersonalInfo
              dog={dog}
              bioAnchorRef={bioAnchorRef}
              hideBio={hideSourceBio}
              hideSurface={overlayOwnsSharedEndpoint}
              hideTitle={overlayOwnsSharedEndpoint && Boolean(activeHero.title)}
              titleAnchorRef={titleAnchorRef}
            />
          </View>
        </PressableArea>
      )}
    </Container>
  );
};

export default VisitingCard;
