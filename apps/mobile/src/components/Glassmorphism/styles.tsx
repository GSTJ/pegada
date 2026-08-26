import type { BlurViewProps } from "expo-blur";

import { LinearGradient } from "expo-linear-gradient";

import Color from "color";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { BlurView } from "@/components/blur-view";

const ThemedBlurView = withUnistyles(BlurView);

/**
 * A static `.attrs` object beat the caller, so `intensity` lands after the
 * spread — `Glassmorphism` passes everything it is given straight through.
 */
export const Container = ({ style, ...props }: BlurViewProps) => (
  <ThemedBlurView {...props} intensity={90} style={[styles.container, style]} />
);

/** The former `.attrs(getGradientProps)`: the theme decides every value. */
export const Gradient = withUnistyles(LinearGradient, (theme) => ({
  colors: [
    new Color(theme.colors.card).fade(0.3).rgb().string(),
    new Color(theme.colors.card).fade(0.5).rgb().string(),
  ] as const,
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
}));

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
