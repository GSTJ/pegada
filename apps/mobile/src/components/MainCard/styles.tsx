import type { LocalImageProps } from "@/components/image";
import type { AnimatedProps } from "react-native-reanimated";

import type { ViewProps } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import Animated from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { css } from "styled-components/native";

import { Image } from "@/components/image";

/**
 * Nothing renders this any more — `FeedbackCard` converted and inlines the same
 * five declarations, as everything in this module already did. It survives for
 * the parity ledger: the pristine `FeedbackCard/styles.ts` interpolates it, and
 * the ledger loads that module from git while resolving its imports against the
 * working tree, so deleting this drops five declarations from ground truth and
 * fails the `AbsolutePosition` check. It goes when styled-components does.
 */
export const absoluteFill = css`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
`;

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
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
  },
  upperPart: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  carouselContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
}));
