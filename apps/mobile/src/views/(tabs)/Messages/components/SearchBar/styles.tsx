import type { SafeAreaViewProps } from "react-native-safe-area-context";

import type { TextInputProps, ViewProps } from "react-native";

import { TextInput as NativeTextInput, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

/**
 * The former `.attrs(props => ({ …, ...props }))`: theme-decided defaults the
 * caller can still override, which is what a `withUnistyles` mapper does — it
 * merges behind the props it is handed.
 */
const ThemedTextInput = withUnistyles(NativeTextInput, (theme) => ({
  placeholderTextColor: theme.colors.placeholder,
  selectionColor: theme.colors.primary,
}));

/** `SafeAreaView` comes from safe-area-context, so it is not autoprocessed. */
const ThemedSafeAreaView = withUnistyles(SafeAreaView);

/**
 * These stay components rather than becoming bare style objects: `index.tsx`
 * types its own props off `typeof TextField`, so the field has to keep a
 * component's shape, and the rest of the module reads better beside it.
 */
export const TextField = ({ style, ...props }: TextInputProps) => (
  <ThemedTextInput {...props} style={[styles.textField, style]} />
);

export const SearchFieldContainer = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.searchFieldContainer, style]} />
);

export const Container = ({ style, ...props }: SafeAreaViewProps) => (
  <ThemedSafeAreaView {...props} style={[styles.container, style]} />
);

const styles = StyleSheet.create((theme) => ({
  textField: {
    color: theme.colors.text,
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[2],
    paddingBottom: theme.spacing[2],
    paddingLeft: theme.spacing[2],
    fontFamily: theme.typography.fontFamily.medium,
    fontSize: theme.typography.sizes.xs.size,
    fontWeight: "medium",
    flexGrow: 1,
  },
  searchFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    paddingTop: 0,
    paddingRight: theme.spacing[3],
    paddingBottom: 0,
    paddingLeft: theme.spacing[3],
    borderWidth: theme.stroke.sm,
    borderColor: theme.colors.border,
    borderStyle: "solid",
    backgroundColor: theme.colors.input,
  },
  container: {
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    paddingLeft: theme.spacing[3],
    borderBottomWidth: theme.stroke.sm,
    borderBottomColor: theme.colors.border,
  },
}));
