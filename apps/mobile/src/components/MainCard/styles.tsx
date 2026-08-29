import type { LocalImageProps } from "@/components/image";
import type { AnimatedProps } from "react-native-reanimated";

import type { Ref } from "react";
import type { View, ViewProps } from "react-native";

import { forwardRef } from "react";

import { LinearGradient } from "expo-linear-gradient";

import Animated from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Image } from "@/components/image";

/**
 * The five declarations every full-bleed layer in the card stack repeats.
 * Exported because `FeedbackCard` spreads it too, which is how its
 * pre-migration source consumed it.
 */
export const absoluteFill = {
  position: "absolute",
  top: 0,
  bottom: 0,
  right: 0,
  left: 0,
} as const;

/** `expo-image` is not autoprocessed, so the sheet reaches it wrapped. */
const ThemedImage = withUnistyles(Image);

/**
 * The card shell. It stays a component because the profile header renders the
 * same shell squared off (`styled(Container)` in
 * `views/(tabs)/Profile/components/UserDogProfileHeader/styles.ts`).
 *
 * Callers pass their animated style through `style`, which lands after the
 * sheet — animated styles have to stay last to win.
 */
export const Container = ({ style, ...props }: AnimatedProps<ViewProps>) => (
  <Animated.View {...props} style={[styles.container, style]} />
);

export const Picture = ({ style, ...props }: LocalImageProps) => (
  <ThemedImage {...props} style={[styles.picture, style]} />
);

/**
 * Stable (never remounted) wrapper around the photo. `Picture` itself remounts
 * (via its `key`) whenever the visible photo index changes, so keeping the
 * measure anchor on this always-mounted outer view gives the manual hero
 * transition (@/components/HeroTransition) a stable frame to measure.
 */
export const PhotoAnchor = forwardRef(
  ({ style, ...props }: AnimatedProps<ViewProps>, ref: Ref<View>) => (
    <Animated.View ref={ref} {...props} style={[styles.photoAnchor, style]} />
  ),
);
PhotoAnchor.displayName = "PhotoAnchor";

/** Full-bleed gradient that darkens the top of the card. */
export const Scrim = withUnistyles(LinearGradient);

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    overflow: "hidden",
    paddingTop: theme.spacing[6],
  },
  picture: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    ...absoluteFill,
  },
  photoAnchor: {
    flex: 1,
    ...absoluteFill,
  },
  hidden: {
    opacity: 0,
  },
  upperPart: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  carouselContainer: {
    flexDirection: "row",
    ...absoluteFill,
  },
  previousImage: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  nextImage: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  scrim: {
    ...absoluteFill,
  },
}));
