import type { ViewProps } from "react-native";

import { View } from "react-native";

import { StyleSheet } from "react-native-unistyles";

/**
 * The module's default export, so it never had a name of its own; the sheet
 * key borrows the file's. It stays a component because both call sites render
 * it as one, one of them with its own margin.
 */
const Divider = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.divider, style]} />
);

export default Divider;

const styles = StyleSheet.create((theme) => ({
  divider: {
    backgroundColor: theme.colors.border,
    height: theme.stroke.sm,
  },
}));
