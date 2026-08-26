import type { PressableProps, StyleProp, ViewStyle } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";

/** `PressableArea` is not autoprocessed, so the sheet reaches it wrapped. */
const ThemedPressableArea = withUnistyles(PressableArea);

/** `Pressable` also accepts a style callback; composing needs a plain style. */
type ContainerProps = { style?: StyleProp<ViewStyle> } & Omit<
  PressableProps,
  "style"
>;

/** Stays a component: `index.tsx` types its own props off `typeof Container`. */
export const Container = ({ style, ...props }: ContainerProps) => (
  <ThemedPressableArea {...props} style={[styles.container, style]} />
);

const styles = StyleSheet.create((theme) => ({
  container: {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    borderWidth: theme.stroke.lg,
    borderColor: theme.colors.border,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    // Optically align
    paddingRight: theme.spacing[0.5],
  },
}));
