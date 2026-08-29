import type { HeroFrame } from "./store";

import { useEffect } from "react";
import { View } from "react-native";

import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

import { Image } from "@/components/image";
import Distance from "@/components/MainCard/components/Distance";
import Pagination from "@/components/MainCard/components/Pagination";
import { styles as mainCardStyles } from "@/components/MainCard/styles";
import { MatchActionBar } from "@/components/MatchActionBar";

import {
  abandonHero,
  areHeroSharedElementsReady,
  endHero,
  markHeroOverlayReady,
  useHeroState,
} from "./store";

const AnimatedImage = Animated.createAnimatedComponent(Image);

// Emil bar: UI motion stays under 300ms. 280ms is the ceiling that still
// reads as one continuous object instead of feeling clipped.
const MORPH_DURATION = 280;

const frameStyle = (frame: HeroFrame) => ({
  x: frame.x,
  y: frame.y,
  width: frame.width,
  height: frame.height,
  borderRadius: frame.borderRadius,
});

const noop = () => {};

/**
 * Renders the flying photo during a manual hero transition. Mounted once, high
 * in the tree (above the navigator), so it stays visible while the source and
 * destination routes swap underneath it. Does nothing until a hero is
 * active. See {@link file://./store.ts} for the why.
 */
export const HeroTransitionOverlay = () => {
  const hero = useHeroState();
  const reduceMotion = useReducedMotion();

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const borderRadius = useSharedValue(0);
  const actionX = useSharedValue(0);
  const actionY = useSharedValue(0);
  const actionWidth = useSharedValue(0);
  const actionHeight = useSharedValue(0);

  const { from, to, id: heroId, actionFrom, actionTo } = hero;
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
  //
  // width/height/borderRadius are genuine layout props, not transform/opacity
  // -- normally a GPU-only violation. This is the one case that justifies it:
  // the card photo and profile photo have different aspect ratios and corner
  // radii, so a true shared-element morph has to interpolate size, not just
  // position. Every value below animates via withTiming from whatever the
  // shared value currently holds (never a fresh mount value), so a new hero
  // starting mid-flight (see the snap effect above, which cancels these same
  // animations) always retargets from the current frame instead of jumping.
  useEffect(() => {
    if (!from || !to || !sharedElementsReady) return;
    const t = frameStyle(to);
    // Reduced motion still needs the same handoff sequencing (route removal
    // waits on the withTiming callback below) -- a duration of 0 keeps that
    // sequencing intact while skipping the perceived motion.
    const config = { duration: reduceMotion ? 0 : MORPH_DURATION };
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
  }, [heroId, to, actionFrom, actionTo, sharedElementsReady, reduceMotion]);

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
    <View pointerEvents="none" style={styles.overlay}>
      <AnimatedImage
        source={{
          uri: hero.source.uri,
          blurhash: hero.source.blurhash ?? undefined,
        }}
        contentFit="cover"
        // The real photos underneath stay visible until the overlay has
        // painted (see store.ts), otherwise the card blanks for the frames
        // the image spends decoding. A transparent background keeps this
        // view invisible during that same gap instead of it (and Android in
        // particular) defaulting to an opaque white paint over them.
        onDisplay={markHeroOverlayReady}
        style={[styles.image, animatedStyle]}
      />
      {hero.chrome ? (
        <Animated.View style={[styles.chrome, animatedStyle]}>
          <View style={mainCardStyles.upperPart}>
            <Distance dog={hero.chrome.dog} />
            <Pagination
              pages={hero.chrome.pages}
              currentPage={hero.chrome.currentPage}
            />
          </View>
        </Animated.View>
      ) : null}
      {hero.chrome && actionFrom && actionTo ? (
        <Animated.View style={[styles.actionBar, actionStyle]}>
          <MatchActionBar
            visualOnly
            onNope={noop}
            onMaybe={noop}
            onYep={noop}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: theme.colors.transparent,
  },
  chrome: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
    paddingTop: 24,
    backgroundColor: theme.colors.transparent,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: theme.colors.transparent,
  },
}));
