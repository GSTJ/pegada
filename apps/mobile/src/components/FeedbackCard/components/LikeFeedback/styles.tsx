import type { ViewProps } from "react-native";

import { View } from "react-native";

import { StyleSheet } from "react-native-unistyles";

/**
 * Stays a component: `MaybeFeedback`, `NopeFeedback` and
 * `SwipeRequestFeedback` all build on it with `withUnistyles(Container)` and
 * only override the background, so the base has to travel with the element.
 */
export const Container = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.container, style]} />
);

const CONTAINER_BACKGROUND_COLOR = "#cbffd0";

const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CONTAINER_BACKGROUND_COLOR,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
  },
}));
