import type { TextProps } from "@/components/text";

import type { TextInputProps, ViewProps } from "react-native";

import { TextInput as NativeTextInput, View } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";

/** The former `.attrs(props => …)`: the placeholder colour is the theme's. */
const ThemedTextInput = withUnistyles(NativeTextInput, (theme) => ({
  placeholderTextColor: theme.colors.placeholder,
}));

/**
 * These stay components rather than becoming bare style objects: `index.tsx`
 * types its own props off `typeof TextInput`, so the field has to keep a
 * component's shape, and the rest of the module reads better beside it.
 */
export const Container = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.container, style]} />
);

export const Content = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.content, style]} />
);

/** `accessible` was a plain `.attrs` default, so it still beats the caller. */
export const TextInput = ({ style, ...props }: TextInputProps) => (
  <ThemedTextInput {...props} accessible style={[styles.textInput, style]} />
);

export const ErrorText = ({ style, ...props }: TextProps) => (
  <Text {...props} style={[styles.errorText, style]} />
);

const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: theme.spacing[5],
    marginBottom: theme.spacing[3.5],
  },
  content: {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "solid",
    backgroundColor: theme.colors.input,
    overflow: "hidden",
  },
  textInput: {
    paddingTop: theme.spacing[4],
    paddingRight: 20,
    paddingBottom: theme.spacing[4],
    paddingLeft: 20,
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: "medium",
    fontSize: theme.typography.sizes.lg.size,
    color: theme.colors.text,
  },
  errorText: {
    marginTop: 5,
  },
}));
