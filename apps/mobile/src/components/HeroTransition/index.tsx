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

import { endHero, HeroFrame, markHeroOverlayReady, useHeroState } from "./store";

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

// Matches the stack "fade" duration closely so the overlay lands as the new
// screen finishes fading in. Slightly springy for a livelier morph.
const MORPH_DURATION = 320;

const frameStyle = (frame: HeroFrame) => ({
  x: frame.x,
  y: frame.y,
  width: frame.width,
  height: frame.height,
});

/**
 * Renders the flying photo during a manual hero transition. Mounted once, high
 * in the tree (above the navigator), so it stays visible while the source and
 * destination screens cross-fade underneath it. Does nothing until a hero is
 * active. See {@link file://./store.ts} for the why.
 */
export const HeroTransitionOverlay = () => {
  const hero = useHeroState();

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  const from = hero.from;
  const to = hero.to;
  const heroId = hero.id;

  // Snap to the source frame the instant a hero starts.
  useEffect(() => {
    if (!from) return;
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(width);
    cancelAnimation(height);
    const f = frameStyle(from);
    x.value = f.x;
    y.value = f.y;
    width.value = f.width;
    height.value = f.height;
    opacity.value = 1;
    // Only re-run when a brand new hero begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, from]);

  // Morph to the destination frame once it's measured, then clear.
  useEffect(() => {
    if (!from || !to) return;
    const t = frameStyle(to);
    const config = { duration: MORPH_DURATION };
    x.value = withTiming(t.x, config);
    y.value = withTiming(t.y, config);
    width.value = withTiming(t.width, config);
    height.value = withTiming(t.height, config, (finished) => {
      "worklet";
      if (finished) {
        opacity.value = 0;
        runOnJS(endHero)();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, to]);

  // Safety net: if the destination never reports a frame (e.g. profile failed
  // to mount), don't leave a frozen photo on screen forever.
  useEffect(() => {
    if (!from || to) return;
    const timeout = setTimeout(() => endHero(), 700);
    return () => clearTimeout(timeout);
  }, [heroId, from, to]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
    width: width.value,
    height: height.value,
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  image: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
