import type { PressableProps, StyleProp, ViewStyle } from "react-native";

import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import Color from "color";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import Close from "@/assets/images/Close.svg";
import { BlurView } from "@/components/blur-view";
import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";

const ThemedPressableArea = withUnistyles(PressableArea);

/** `Pressable` also accepts a style callback; composing needs a plain style. */
type CloseButtonProps = { style?: StyleProp<ViewStyle> } & Omit<
  PressableProps,
  "style"
>;

/**
 * Stays a component: `LikeLimitReached` pins the same button to the corner of
 * its modal with `withUnistyles(CloseButton)`, so the round background has to
 * travel with the element rather than sit in this module's sheet alone.
 */
export const CloseButton = ({ style, ...props }: CloseButtonProps) => (
  <ThemedPressableArea
    {...props}
    accessible
    style={[styles.closeButton, style]}
  />
);

export const Header = withUnistyles(BlurView);

export const HeroImage = withUnistyles(Image);

export const Title = withUnistyles(Text);

export const Subtitle = withUnistyles(Text);

export const CancelAnytime = withUnistyles(Text);

export const CloseIcon = withUnistyles(Close, (theme) => ({
  width: 10,
  height: 10,
  fill: theme.colors.text,
}));

export const GradientEffect = withUnistyles(LinearGradient, () => ({
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
  colors: ["#ffffff00", "#ffffff85", "#ffffff00"] as const,
}));

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[2],
    paddingLeft: theme.spacing[4],
    borderBottomWidth: theme.stroke.sm,
    borderBottomColor: theme.colors.border,
    position: "absolute",
    width: "100%",
  },
  closeButton: {
    height: theme.spacing[8],
    width: theme.spacing[8],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: new Color(theme.colors.text).alpha(0.05).toString(),
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
  },
  heroImage: {
    height: 200,
    borderTopLeftRadius: theme.radii.xl,
    borderBottomRightRadius: theme.radii.xl,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    color: new Color(theme.colors.primary).lighten(0.1).toString(),
    textAlign: "center",
    maxWidth: 300,
    alignSelf: "center",
  },
  cancelAnytime: {
    textAlign: "center",
  },
  gradientEffect: {
    position: "absolute",
    top: 0,
    height: 2,
    width: "100%",
  },
}));
