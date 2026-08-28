import type {
  PressableProps,
  StyleProp,
  ViewProps,
  ViewStyle,
} from "react-native";

import { View } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";

const BACK_CONTAINER_SIZE = 60;
const HIT_SLOP = {
  top: 15,
  bottom: 15,
  left: 15,
  right: 15,
};

/** `PressableArea` is not autoprocessed, so the sheet reaches it wrapped. */
const ThemedPressableArea = withUnistyles(PressableArea);

/** `Pressable` also accepts a style callback; composing needs a plain style. */
type ContainerProps = { style?: StyleProp<ViewStyle> } & Omit<
  PressableProps,
  "style"
>;

/**
 * Stays a component: `index.tsx` types its own props off `typeof Container`.
 * `hitSlop` was a static `.attrs`, so it still sits after the spread and beats
 * the caller, exactly as `.attrs` used to have it.
 */
export const Container = ({ style, ...props }: ContainerProps) => (
  <ThemedPressableArea
    {...props}
    hitSlop={HIT_SLOP}
    style={[styles.container, style]}
  />
);

export const Content = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.content, style]} />
);

const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: -BACK_CONTAINER_SIZE / 2,
    right: theme.spacing[4],
    borderTopLeftRadius: BACK_CONTAINER_SIZE,
    borderTopRightRadius: BACK_CONTAINER_SIZE,
    borderBottomRightRadius: BACK_CONTAINER_SIZE,
    borderBottomLeftRadius: BACK_CONTAINER_SIZE,
    overflow: "hidden",
    alignSelf: "flex-end",
    zIndex: 2,
    borderWidth: theme.stroke.sm,
    borderColor: theme.colors.border,
  },
  content: {
    width: BACK_CONTAINER_SIZE,
    height: BACK_CONTAINER_SIZE,
    borderTopLeftRadius: BACK_CONTAINER_SIZE,
    borderTopRightRadius: BACK_CONTAINER_SIZE,
    borderBottomRightRadius: BACK_CONTAINER_SIZE,
    borderBottomLeftRadius: BACK_CONTAINER_SIZE,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: theme.spacing[1],
  },
}));
