import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";

import { MatchActionBar } from "@/components/MatchActionBar";
import Distance from "@/components/MainCard/components/Distance";
import Pagination from "@/components/MainCard/components/Pagination";
import { UpperPart } from "@/components/MainCard/styles";
import {
  abandonHero,
  areHeroSharedElementsReady,
  endHero,
  HeroFrame,
  markHeroOverlayReady,
  useHeroState,
} from "./store";

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

// Short enough to preserve the direct-manipulation feel while giving the
// photo and shared controls time to read as one continuous object.
const MORPH_DURATION = 320;

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
export const HeroTransitionOverlay = () => {
  const hero = useHeroState();

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const borderRadius = useSharedValue(0);
  const actionX = useSharedValue(0);
  const actionY = useSharedValue(0);
  const actionWidth = useSharedValue(0);
  const actionHeight = useSharedValue(0);

  const from = hero.from;
  const to = hero.to;
  const heroId = hero.id;
  const actionFrom = hero.actionFrom;
  const actionTo = hero.actionTo;
  const sharedElementsReady = areHeroSharedElementsReady(hero);

  // Snap to the source frame the instant a hero starts.
  useEffect(() => {
    if (!from) return;
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(width);
    cancelAnimation(height);
    cancelAnimation(borderRadius);
    const f = frameStyle(from);
    x.value = f.x;
    y.value = f.y;
    width.value = f.width;
    height.value = f.height;
    borderRadius.value = f.borderRadius ?? 0;
    if (actionFrom) {
      actionX.value = actionFrom.x;
      actionY.value = actionFrom.y;
      actionWidth.value = actionFrom.width;
      actionHeight.value = actionFrom.height;
    }
    // Only re-run when a brand new hero begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, from, actionFrom]);

  // Morph to the destination frame once it's measured, then clear.
  useEffect(() => {
    if (!from || !to || !sharedElementsReady) return;
    const t = frameStyle(to);
    const config = { duration: MORPH_DURATION };
    x.value = withTiming(t.x, config);
    y.value = withTiming(t.y, config);
    width.value = withTiming(t.width, config);
    borderRadius.value = withTiming(t.borderRadius ?? 0, config);
    if (actionFrom && actionTo) {
      actionX.value = withTiming(actionTo.x, config);
      actionY.value = withTiming(actionTo.y, config);
      actionWidth.value = withTiming(actionTo.width, config);
      actionHeight.value = withTiming(actionTo.height, config);
    }
    height.value = withTiming(t.height, config, (finished) => {
      "worklet";
      if (finished) {
        runOnJS(endHero)();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, to, actionFrom, actionTo, sharedElementsReady]);

  // Safety net: if the destination never reports a frame (e.g. profile failed
  // to mount), don't leave a frozen photo on screen forever.
  useEffect(() => {
    if (!heroId || !from || sharedElementsReady) return;
    const timeout = setTimeout(() => abandonHero(heroId), 700);
    return () => clearTimeout(timeout);
  }, [heroId, from, sharedElementsReady]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
    width: width.value,
    height: height.value,
    borderRadius: borderRadius.value,
  }));
  const actionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: actionX.value }, { translateY: actionY.value }],
    width: actionWidth.value,
    height: actionHeight.value,
  }));

  if (!heroId || !from || !hero.source?.uri) return null;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <AnimatedExpoImage
        source={{ uri: hero.source.uri }}
        placeholder={hero.source.blurhash ? { blurhash: hero.source.blurhash } : undefined}
        contentFit="cover"
        cachePolicy="memory-disk"
        // The real photos underneath stay visible until the overlay has
        // painted (see store.ts), otherwise the card blanks for the frames
        // the image spends decoding.
        onDisplay={markHeroOverlayReady}
        style={[styles.image, animatedStyle]}
      />
      {hero.chrome ? (
        <Animated.View style={[styles.chrome, animatedStyle]}>
          <UpperPart>
            <Distance dog={hero.chrome.dog} />
            <Pagination pages={hero.chrome.pages} currentPage={hero.chrome.currentPage} />
          </UpperPart>
        </Animated.View>
      ) : null}
      {hero.chrome && actionFrom && actionTo ? (
        <Animated.View style={[styles.actionBar, actionStyle]}>
          <MatchActionBar visualOnly onNope={() => {}} onMaybe={() => {}} onYep={() => {}} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  image: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  chrome: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    paddingTop: 24,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
