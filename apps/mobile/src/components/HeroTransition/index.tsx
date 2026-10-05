import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text as NativeText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { FullWindowOverlay } from "react-native-screens";
import { useTheme } from "styled-components/native";

import { MatchActionBar } from "@/components/MatchActionBar";
import Distance from "@/components/MainCard/components/Distance";
import Pagination from "@/components/MainCard/components/Pagination";
import { UpperPart } from "@/components/MainCard/styles";
import GoBack from "@/views/DogProfile/components/GoBack";
import {
  areHeroSharedElementsReady,
  completeForwardTargetRecovery,
  completeReverseHandoffRecovery,
  confirmHeroOverlayCleared,
  createHeroMotionClock,
  dispatchHeroForwardNavigation,
  endHero,
  getForwardGoBackOcclusionFrame,
  getForwardPhotoExposureFrames,
  HeroFrame,
  isHeroForwardMotionReady,
  markHeroMotionStarted,
  markHeroOverlayReady,
  useHeroState,
} from "./store";
import { HERO_MORPH_DURATION, useHeroMotionProgress, useHeroRecoveryProgress } from "./motion";

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);
const STATUS_BAR_FORWARD_PRESENTATION_HYSTERESIS = 0.28;
const STATUS_BAR_REVERSE_PRESENTATION_HYSTERESIS = 0.15;

// Short enough to preserve the direct-manipulation feel while giving the
// photo and shared controls time to read as one continuous object.
const frameStyle = (frame: HeroFrame) => ({
  x: frame.x,
  y: frame.y,
  width: frame.width,
  height: frame.height,
  borderRadius: frame.borderRadius,
});

/**
 * Renders the flying photo during a manual hero transition. Mounted once, high
 * in the tree (above the navigator), so it stays visible while the source and
 * destination routes swap underneath it. Does nothing until a hero is
 * active. See {@link file://./store.ts} for the why.
 */
const HeroTransitionContent = () => {
  const hero = useHeroState();
  const theme = useTheme();
  const motionClock = useRef(createHeroMotionClock(HERO_MORPH_DURATION)).current;
  const progressRunId = useRef(0);
  const recoveryRunId = useRef(0);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const borderRadius = useSharedValue(0);
  const shadowOpacity = useSharedValue(0);
  const shadowRadius = useSharedValue(0);
  const shadowOffsetX = useSharedValue(0);
  const shadowOffsetY = useSharedValue(0);
  const elevation = useSharedValue(0);
  const progress = useHeroMotionProgress();
  const recovery = useHeroRecoveryProgress();
  const chromeX = useSharedValue(0);
  const chromeY = useSharedValue(0);
  const chromeWidth = useSharedValue(0);
  const chromeHeight = useSharedValue(0);
  const actionX = useSharedValue(0);
  const actionY = useSharedValue(0);
  const actionWidth = useSharedValue(0);
  const actionHeight = useSharedValue(0);
  const titleX = useSharedValue(0);
  const titleY = useSharedValue(0);
  const titleWidth = useSharedValue(0);
  const titleHeight = useSharedValue(0);

  const from = hero.from;
  const to = hero.to;
  const heroId = hero.id;
  const heroRunId = hero.runId;
  const overlayReady = hero.overlayReady;
  const chromeFrom = hero.chromeFrom;
  const chromeTo = hero.chromeTo;
  const actionFrom = hero.actionFrom;
  const actionTo = hero.actionTo;
  const titleFrom = hero.titleFrom;
  const titleTo = hero.titleTo;
  const sourceBio = hero.sourceBio;
  const sourceBioFrame = hero.sourceBioFrame;
  const goBackFrame = hero.goBackFrame;
  const sharedElementsReady = areHeroSharedElementsReady(hero);
  const [imageAssignedRunId, setImageAssignedRunId] = useState(0);
  const [hostLaidOutRunId, setHostLaidOutRunId] = useState(0);
  const [reverseEndpointsCommittedRunId, setReverseEndpointsCommittedRunId] = useState(0);
  const overlayVisible =
    imageAssignedRunId === heroRunId &&
    hostLaidOutRunId === heroRunId &&
    !(hero.phase === "reverse" && hero.reverseFallback === "scene");
  // expo-image's native onDisplay fires after assigning UIImage, before the
  // freshly mounted FullWindowOverlay is guaranteed to reach CoreAnimation.
  // Present the clone while the real endpoint still owns the pixels, allow a
  // complete display turn, then transfer ownership in the store. Coupling
  // visibility and endpoint hiding produced a three-frame black flash.
  useEffect(() => {
    if (!hero.phase || !overlayVisible || overlayReady || !heroRunId) return;

    let presentationFrame: number | null = null;
    const commitFrame = requestAnimationFrame(() => {
      presentationFrame = requestAnimationFrame(() => {
        presentationFrame = null;
        markHeroOverlayReady(heroRunId);
      });
    });

    return () => {
      cancelAnimationFrame(commitFrame);
      if (presentationFrame !== null) cancelAnimationFrame(presentationFrame);
    };
  }, [hero.phase, heroRunId, overlayReady, overlayVisible]);
  // The source screen is already native-presented during reverse. Give its
  // opacity-zero endpoint commit one full display turn before moving clones
  // back over it. Forward uses the destination screen's native viewDidAppear
  // acknowledgement instead of guessing presentation from JS frames.
  useEffect(() => {
    if (hero.phase !== "reverse" || !sharedElementsReady || !overlayReady || !heroRunId) return;

    let presentationFrame: number | null = null;
    const commitFrame = requestAnimationFrame(() => {
      presentationFrame = requestAnimationFrame(() => {
        presentationFrame = null;
        setReverseEndpointsCommittedRunId(heroRunId);
      });
    });

    return () => {
      cancelAnimationFrame(commitFrame);
      if (presentationFrame !== null) cancelAnimationFrame(presentationFrame);
    };
  }, [hero.phase, heroRunId, overlayReady, sharedElementsReady]);
  const motionPresentationReady =
    hero.phase === "forward"
      ? isHeroForwardMotionReady(hero)
      : hero.phase === "reverse" && reverseEndpointsCommittedRunId === heroRunId;
  // Passive effects run only after React has committed source endpoint
  // opacity to the native tree. Wait one display turn as well: iOS can flush
  // the transparentModal snapshot before that native opacity transaction is
  // presented even though React's passive effect has already run.
  useEffect(() => {
    if (hero.phase !== "forward" || !overlayReady || !heroRunId) return;
    const animationFrame = requestAnimationFrame(() => {
      dispatchHeroForwardNavigation(heroRunId);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [hero.phase, heroRunId, overlayReady]);

  // Snap to the source frame the instant a hero starts.
  useLayoutEffect(() => {
    if (!from) return;
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(width);
    cancelAnimation(height);
    cancelAnimation(borderRadius);
    cancelAnimation(shadowOpacity);
    cancelAnimation(shadowRadius);
    cancelAnimation(shadowOffsetX);
    cancelAnimation(shadowOffsetY);
    cancelAnimation(elevation);
    cancelAnimation(progress);
    cancelAnimation(recovery);
    cancelAnimation(chromeX);
    cancelAnimation(chromeY);
    cancelAnimation(chromeWidth);
    cancelAnimation(chromeHeight);
    cancelAnimation(actionX);
    cancelAnimation(actionY);
    cancelAnimation(actionWidth);
    cancelAnimation(actionHeight);
    cancelAnimation(titleX);
    cancelAnimation(titleY);
    cancelAnimation(titleWidth);
    cancelAnimation(titleHeight);
    const f = frameStyle(from);
    x.value = f.x;
    y.value = f.y;
    width.value = f.width;
    height.value = f.height;
    borderRadius.value = f.borderRadius ?? 0;
    shadowOpacity.value = hero.shadowFrom.opacity;
    shadowRadius.value = hero.shadowFrom.radius;
    shadowOffsetX.value = hero.shadowFrom.offset.width;
    shadowOffsetY.value = hero.shadowFrom.offset.height;
    elevation.value = hero.shadowFrom.elevation;
    progress.value = 0;
    recovery.value = 0;
    progressRunId.current = 0;
    recoveryRunId.current = 0;
    if (actionFrom) {
      actionX.value = actionFrom.x;
      actionY.value = actionFrom.y;
      actionWidth.value = actionFrom.width;
      actionHeight.value = actionFrom.height;
    }
    if (chromeFrom) {
      chromeX.value = chromeFrom.x;
      chromeY.value = chromeFrom.y;
      chromeWidth.value = chromeFrom.width;
      chromeHeight.value = chromeFrom.height;
    }
    if (titleFrom) {
      titleX.value = titleFrom.x;
      titleY.value = titleFrom.y;
      titleWidth.value = titleFrom.width;
      titleHeight.value = titleFrom.height;
    }
    // Only re-run when a brand new hero begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroRunId, from, chromeFrom, actionFrom, titleFrom, hero.shadowFrom]);

  // Exact endpoint acknowledgements are the ordinary path. If one never
  // arrives after motion visibly lands, crossfade ownership with a separate
  // failure-only q so shadows and translucent controls never blink.
  useEffect(() => {
    const forwardTargetRecovery = hero.phase === "forward" && hero.forwardFallback === "target";
    const reverseSourceRecovery = hero.phase === "reverse" && hero.reverseFallback === "handoff";
    if ((!forwardTargetRecovery && !reverseSourceRecovery) || !heroRunId) return;
    if (recoveryRunId.current === heroRunId) return;
    recoveryRunId.current = heroRunId;
    cancelAnimation(recovery);
    recovery.value = 0;
    recovery.value = withTiming(1, { duration: HERO_MORPH_DURATION }, (finished) => {
      if (!finished) return;
      if (forwardTargetRecovery) runOnJS(completeForwardTargetRecovery)(heroRunId);
      else runOnJS(completeReverseHandoffRecovery)(heroRunId);
    });
  }, [hero.forwardFallback, hero.phase, hero.reverseFallback, heroRunId, recovery]);

  // The photo owns transition completion. A corrected photo measurement
  // retargets with only the time left on this run's original deadline.
  useEffect(() => {
    if (
      !from ||
      !to ||
      !sharedElementsReady ||
      !motionPresentationReady ||
      !overlayReady ||
      !heroRunId
    )
      return;
    markHeroMotionStarted(heroRunId);
    const t = frameStyle(to);
    const config = { duration: motionClock.remaining(heroRunId, Date.now()) };
    x.value = withTiming(t.x, config);
    y.value = withTiming(t.y, config);
    width.value = withTiming(t.width, config);
    borderRadius.value = withTiming(t.borderRadius ?? 0, config);
    shadowOpacity.value = withTiming(hero.shadowTo.opacity, config);
    shadowRadius.value = withTiming(hero.shadowTo.radius, config);
    shadowOffsetX.value = withTiming(hero.shadowTo.offset.width, config);
    shadowOffsetY.value = withTiming(hero.shadowTo.offset.height, config);
    elevation.value = withTiming(hero.shadowTo.elevation, config);
    if (progressRunId.current !== heroRunId) {
      progressRunId.current = heroRunId;
      progress.value = withTiming(1, config);
    }
    height.value = withTiming(t.height, config, (finished) => {
      "worklet";
      if (finished) {
        runOnJS(endHero)(heroRunId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    heroRunId,
    to,
    sharedElementsReady,
    motionPresentationReady,
    overlayReady,
    motionClock,
    hero.shadowTo,
  ]);

  // Distance and pagination own a different layout region from the photo:
  // Swipe starts below the card padding and DogProfile starts below its safe
  // area. Animate the measured region itself so the overlay lands on the real
  // controls instead of guessing a fixed inset and snapping at handoff.
  useEffect(() => {
    if (
      !chromeFrom ||
      !chromeTo ||
      !sharedElementsReady ||
      !motionPresentationReady ||
      !overlayReady ||
      !heroRunId
    )
      return;
    const config = { duration: motionClock.remaining(heroRunId, Date.now()) };
    chromeX.value = withTiming(chromeTo.x, config);
    chromeY.value = withTiming(chromeTo.y, config);
    chromeWidth.value = withTiming(chromeTo.width, config);
    chromeHeight.value = withTiming(chromeTo.height, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    heroRunId,
    chromeFrom,
    chromeTo,
    sharedElementsReady,
    motionPresentationReady,
    overlayReady,
    motionClock,
  ]);

  // Action controls share the photo's deadline but retarget independently.
  // A late action measurement must never restart or extend the photo morph.
  useEffect(() => {
    if (
      !actionFrom ||
      !actionTo ||
      !sharedElementsReady ||
      !motionPresentationReady ||
      !overlayReady ||
      !heroRunId
    )
      return;
    const config = { duration: motionClock.remaining(heroRunId, Date.now()) };
    actionX.value = withTiming(actionTo.x, config);
    actionY.value = withTiming(actionTo.y, config);
    actionWidth.value = withTiming(actionTo.width, config);
    actionHeight.value = withTiming(actionTo.height, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    heroRunId,
    actionFrom,
    actionTo,
    sharedElementsReady,
    motionPresentationReady,
    overlayReady,
    motionClock,
  ]);

  // Name + age are the same semantic element at both endpoints. Their
  // measured frame and color move on the photo's deadline; the bio is kept
  // separate because its line wrapping differs between card and profile.
  useEffect(() => {
    if (
      !titleFrom ||
      !titleTo ||
      !sharedElementsReady ||
      !motionPresentationReady ||
      !overlayReady ||
      !heroRunId
    )
      return;
    const config = { duration: motionClock.remaining(heroRunId, Date.now()) };
    titleX.value = withTiming(titleTo.x, config);
    titleY.value = withTiming(titleTo.y, config);
    titleWidth.value = withTiming(titleTo.width, config);
    titleHeight.value = withTiming(titleTo.height, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    heroRunId,
    titleFrom,
    titleTo,
    sharedElementsReady,
    motionPresentationReady,
    overlayReady,
    motionClock,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
    width: width.value,
    height: height.value,
    borderRadius: borderRadius.value,
    shadowOpacity: shadowOpacity.value,
    shadowRadius: shadowRadius.value,
    shadowOffset: {
      width: shadowOffsetX.value,
      height: shadowOffsetY.value,
    },
    elevation: elevation.value,
  }));
  const imageStyle = useAnimatedStyle(() => ({ borderRadius: borderRadius.value }));
  const bottomSurfaceStyle = useAnimatedStyle(() => ({
    opacity: hero.phase === "reverse" ? progress.value : 1 - progress.value,
  }));
  const topSurfaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1],
      [hero.topSurfaceFromOpacity, hero.topSurfaceToOpacity],
      Extrapolation.CLAMP,
    ),
  }));
  const actionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: actionX.value }, { translateY: actionY.value }],
    width: actionWidth.value,
    height: actionHeight.value,
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chromeX.value }, { translateY: chromeY.value }],
    width: chromeWidth.value,
    height: chromeHeight.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: titleX.value }, { translateY: titleY.value }],
    width: titleWidth.value,
    height: titleHeight.value,
    opacity: 1,
    color: interpolateColor(
      progress.value,
      [0, 1],
      hero.phase === "reverse"
        ? [theme.colors.text, theme.colors.white]
        : [theme.colors.white, theme.colors.text],
    ),
  }));
  // The card summary and profile description wrap differently, so moving one
  // text layout between both frames would visibly reflow mid-flight. Stage a
  // clean dissolve instead: the source summary leaves early on forward and
  // returns only after the title has cleared the profile copy on reverse.
  const sourceBioStyle = useAnimatedStyle(() => ({
    opacity:
      hero.phase === "reverse"
        ? interpolate(progress.value, [0.65, 1], [0, 1], Extrapolation.CLAMP)
        : interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
  }));
  const goBackStyle = useAnimatedStyle(() => ({
    opacity: hero.phase === "reverse" ? 1 - progress.value : progress.value,
  }));
  const targetOnlyChromeStyle = useAnimatedStyle(() => ({
    opacity: hero.phase === "reverse" ? 1 - progress.value : progress.value,
  }));
  const overlayRecoveryStyle = useAnimatedStyle(() => ({
    opacity:
      hero.forwardFallback === "target" || hero.reverseFallback === "handoff"
        ? 1 - recovery.value
        : 1,
  }));
  const targetOnlyChromeFrame =
    hero.sourceKind === "chat" ? (hero.phase === "reverse" ? chromeFrom : chromeTo) : null;
  const recoveryActive = hero.forwardFallback === "target" || hero.reverseFallback === "handoff";
  // Fabric installs a cheap rounded CALayer shadowPath only for an opaque
  // carrier. Match the real themed photo surface so alpha-bearing WebPs cannot
  // expose a dark fringe; shadowless Chat avatars keep their translucent fill.
  const shadowCarrierColor =
    hero.shadowFrom.opacity > 0 ||
    hero.shadowTo.opacity > 0 ||
    hero.shadowFrom.elevation > 0 ||
    hero.shadowTo.elevation > 0
      ? theme.colors.background
      : "transparent";
  const forwardPhotoExposureFrames =
    hero.phase === "forward" &&
    hero.forwardFallback === "target" &&
    to &&
    hero.forwardPhotoCorrection
      ? getForwardPhotoExposureFrames(to, hero.forwardPhotoCorrection)
      : [];
  const forwardGoBackOcclusionFrame =
    hero.phase === "forward" &&
    hero.forwardFallback === "target" &&
    hero.forwardGoBackRecoveryMode === "covered" &&
    to &&
    goBackFrame
      ? getForwardGoBackOcclusionFrame(to, goBackFrame, hero.forwardGoBackCorrection)
      : null;

  if (!heroId || !from || !hero.source?.uri) return null;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => setHostLaidOutRunId(heroRunId)}
      style={[StyleSheet.absoluteFill, { opacity: overlayVisible ? 1 : 0 }]}
    >
      <Animated.View
        needsOffscreenAlphaCompositing={Platform.OS === "android" ? recoveryActive : undefined}
        renderToHardwareTextureAndroid={Platform.OS === "android" ? recoveryActive : undefined}
        style={[StyleSheet.absoluteFill, overlayRecoveryStyle]}
      >
        <Animated.View
          style={[
            styles.imageFrame,
            {
              backgroundColor: shadowCarrierColor,
              shadowColor: hero.shadowFrom.color,
            },
            animatedStyle,
          ]}
        >
          <Animated.View style={[styles.clippedSurface, imageStyle]}>
            <AnimatedExpoImage
              key={heroRunId}
              source={{ uri: hero.source.uri }}
              placeholder={hero.source.blurhash ? { blurhash: hero.source.blurhash } : undefined}
              contentFit="cover"
              cachePolicy="memory-disk"
              // Arm presentation first; endpoint ownership transfers only after
              // the FullWindowOverlay has painted this copy for a full frame.
              onDisplay={() => setImageAssignedRunId(heroRunId)}
              style={styles.image}
            />
            {hero.cardSurface ? (
              <Animated.View style={[StyleSheet.absoluteFill, topSurfaceStyle]}>
                <LinearGradient
                  pointerEvents="none"
                  accessible={false}
                  colors={[
                    "rgba(0, 0, 0, .65)",
                    "rgba(0, 0, 0, 0)",
                    "rgba(0, 0, 0, 0)",
                    "rgba(0, 0, 0, 0)",
                  ]}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            ) : null}
            {hero.bottomSurfaceLocations ? (
              <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, bottomSurfaceStyle]}
              >
                <LinearGradient
                  pointerEvents="none"
                  accessible={false}
                  colors={[
                    "rgba(0, 0, 0, 0)",
                    "rgba(0, 0, 0, 0)",
                    "rgba(0, 0, 0, .7)",
                    "rgba(0, 0, 0, .8)",
                  ]}
                  locations={hero.bottomSurfaceLocations}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            ) : null}
          </Animated.View>
        </Animated.View>
        {forwardPhotoExposureFrames.map((frame, index) => (
          <View
            key={`photo-exposure-${index}`}
            style={{
              position: "absolute",
              left: frame.x,
              top: frame.y,
              width: frame.width,
              height: frame.height,
              backgroundColor: theme.colors.background,
            }}
          />
        ))}
        {hero.title && titleFrom ? (
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                fontFamily: theme.typography.fontFamily.black,
                fontSize: theme.typography.sizes.xl.size,
              },
              titleStyle,
            ]}
          >
            {hero.title.name}
            {hero.title.age ? (
              <NativeText
                style={{
                  fontFamily: theme.typography.fontFamily.medium,
                  fontSize: theme.typography.sizes.lg.size,
                }}
              >
                , {hero.title.age}
              </NativeText>
            ) : null}
          </Animated.Text>
        ) : null}
        {hero.chrome && hero.sourceKind !== "chat" && chromeFrom ? (
          <Animated.View style={[styles.chrome, chromeStyle]}>
            <UpperPart>
              <Distance dog={hero.chrome.dog} />
              <Pagination pages={hero.chrome.pages} currentPage={hero.chrome.currentPage} />
            </UpperPart>
          </Animated.View>
        ) : null}
        {hero.chrome && targetOnlyChromeFrame ? (
          <Animated.View
            style={[
              styles.chrome,
              {
                transform: [
                  { translateX: targetOnlyChromeFrame.x },
                  { translateY: targetOnlyChromeFrame.y },
                ],
                width: targetOnlyChromeFrame.width,
                height: targetOnlyChromeFrame.height,
              },
              targetOnlyChromeStyle,
            ]}
          >
            <UpperPart>
              <Distance dog={hero.chrome.dog} />
              <Pagination pages={hero.chrome.pages} currentPage={hero.chrome.currentPage} />
            </UpperPart>
          </Animated.View>
        ) : null}
        {hero.chrome && actionFrom ? (
          <Animated.View style={[styles.actionBar, actionStyle]}>
            <MatchActionBar visualOnly onNope={() => {}} onMaybe={() => {}} onYep={() => {}} />
          </Animated.View>
        ) : null}
        {sourceBio && sourceBioFrame ? (
          <Animated.Text
            numberOfLines={sourceBio.numberOfLines}
            style={[
              styles.sourceBio,
              {
                left: sourceBioFrame.x,
                top: sourceBioFrame.y,
                width: sourceBioFrame.width,
                height: sourceBioFrame.height,
                color: theme.colors.white,
                fontFamily: theme.typography.fontFamily.regular,
                fontSize: theme.typography.sizes.md.size,
              },
              sourceBioStyle,
            ]}
          >
            {sourceBio.text}
          </Animated.Text>
        ) : null}
        {forwardGoBackOcclusionFrame ? (
          <View
            style={{
              position: "absolute",
              left: forwardGoBackOcclusionFrame.x,
              top: forwardGoBackOcclusionFrame.y,
              width: forwardGoBackOcclusionFrame.width,
              height: forwardGoBackOcclusionFrame.height,
              backgroundColor: theme.colors.background,
            }}
          />
        ) : null}
        {goBackFrame ? (
          <Animated.View
            style={[
              styles.goBack,
              {
                left: goBackFrame.x,
                top: goBackFrame.y,
                width: goBackFrame.width,
                height: goBackFrame.height,
              },
              goBackStyle,
            ]}
          >
            <GoBack visualOnly style={styles.goBackClone} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
};

const HeroStatusBarOwner = () => {
  const hero = useHeroState();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useHeroMotionProgress();
  // Switch when the moving photo edge crosses the system glyph band. A fixed
  // progress threshold is wrong across card insets, Chat avatars and devices
  // with different safe areas, leaving white glyphs above a pale photo.
  const photoTravel = hero.from && hero.to ? hero.to.y - hero.from.y : 0;
  const statusBarGlyphCenterY = Math.max(10, insets.top * 0.45);
  const rawSwitchProgress =
    hero.from && photoTravel !== 0 ? (statusBarGlyphCenterY - hero.from.y) / photoTravel : 0.5;
  // Reanimated geometry and UIKit's status-bar style do not join the same
  // presentation transaction. Cross inside the contrast-safe overlap band:
  // light glyphs arrive before the photo darkens on forward, while dark
  // glyphs wait until the source surface has brightened on reverse.
  const presentationOffset =
    hero.phase === "reverse"
      ? STATUS_BAR_REVERSE_PRESENTATION_HYSTERESIS
      : -STATUS_BAR_FORWARD_PRESENTATION_HYSTERESIS;
  const statusBarSwitchProgress = Math.max(
    0.15,
    Math.min(0.85, rawSwitchProgress + presentationOffset),
  );
  const activeStatusRunId = useRef(hero.runId);
  const [pastSwitchPoint, setPastSwitchPoint] = useState(false);
  const commitPastSwitchPoint = useCallback((runId: number) => {
    if (activeStatusRunId.current !== runId) return;
    // Progress is monotonic within one hero run. Never let an inset/threshold
    // correction or a delayed worklet callback switch the glyphs back.
    setPastSwitchPoint(true);
  }, []);

  useLayoutEffect(() => {
    activeStatusRunId.current = hero.runId;
    setPastSwitchPoint(false);
  }, [hero.runId]);
  useAnimatedReaction(
    () => progress.value >= statusBarSwitchProgress,
    (next, previous) => {
      if (next && !previous) runOnJS(commitPastSwitchPoint)(hero.runId);
    },
    [commitPastSwitchPoint, hero.runId, statusBarSwitchProgress],
  );

  const sourceStyle = theme.dark ? "light" : "dark";
  const style =
    hero.phase === "reverse"
      ? pastSwitchPoint
        ? sourceStyle
        : "light"
      : pastSwitchPoint
        ? "light"
        : sourceStyle;

  // iOS implements an animated bar-style change by fading the system glyphs
  // through transparency. Over a moving photo that creates several frames of
  // unreadable, near-invisible status icons. Switch at the geometric midpoint
  // without a native crossfade so every frame keeps a legible foreground.
  return <StatusBar animated={false} style={style} />;
};

/**
 * A transparent native modal can sit above the navigator's React sibling on
 * iOS. Mount the otherwise inert visual overlay in RNScreens' window only for
 * the lifetime of an active hero, then remove that accessibility window
 * completely when ownership ends.
 */
export const HeroTransitionOverlay = () => {
  const hero = useHeroState();
  const lastReverseRun = useRef<number | null>(null);

  // This owner must stay mounted for the commit where the child overlay has
  // disappeared. A child effect can never observe that phase-null render.
  useLayoutEffect(() => {
    if (hero.phase === "reverse") {
      lastReverseRun.current = hero.runId;
      return;
    }
    if (hero.phase === "forward") {
      lastReverseRun.current = null;
      return;
    }
    const clearedRunId = lastReverseRun.current;
    if (!clearedRunId) return;
    lastReverseRun.current = null;
    confirmHeroOverlayCleared(clearedRunId);
  }, [hero.phase, hero.runId]);

  if (!hero.id || !hero.phase) return null;

  const content = (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <HeroTransitionContent />
      <HeroStatusBarOwner />
    </View>
  );

  if (Platform.OS !== "ios") return content;
  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal={false}>
      {content}
    </FullWindowOverlay>
  );
};

const styles = StyleSheet.create({
  imageFrame: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  clippedSurface: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  image: StyleSheet.absoluteFillObject,
  title: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  chrome: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
  },
  actionBar: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  sourceBio: {
    position: "absolute",
  },
  goBack: {
    position: "absolute",
  },
  goBackClone: {
    alignSelf: "flex-start",
    marginTop: 0,
    right: 0,
  },
});
