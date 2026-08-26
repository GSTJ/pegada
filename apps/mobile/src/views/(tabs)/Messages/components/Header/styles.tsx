import type { ViewProps } from "react-native";

import { View } from "react-native";

import { StyleSheet } from "react-native-unistyles";

export const Container = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.container, style]} />
);

/**
 * The gutter between two match previews. It stays a component because the
 * list hands it to `ItemSeparatorComponent`, which wants a component type
 * rather than a style.
 */
export const PreviewSeparator = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.previewSeparator, style]} />
);

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
  },
  previewSeparator: {
    width: theme.spacing[3],
  },
}));
