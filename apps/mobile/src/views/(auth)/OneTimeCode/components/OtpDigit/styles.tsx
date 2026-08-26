import type { TextInputProps, TextProps, ViewProps } from "react-native";

import { forwardRef } from "react";
import {
  Dimensions,
  Text,
  TextInput as NativeTextInput,
  View,
} from "react-native";

import { StyleSheet } from "react-native-unistyles";

const deviceHeight = Dimensions.get("window").height;

export const isSmallDevice = deviceHeight < 700;

/**
 * These stay components rather than becoming bare style objects: `index.tsx`
 * types its own props off `typeof Container`, and the digit boxes are the
 * module's vocabulary — every one of them is composed with a caller style.
 */
export const Container = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.container, style]} />
);

/** `OtpInput` drives focus through a ref, so this one has to forward it. */
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(
  ({ style, ...props }, ref) => (
    <NativeTextInput {...props} ref={ref} style={[styles.textInput, style]} />
  ),
);

TextInput.displayName = "TextInput";

export const AbsoluteContainer = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.absoluteContainer, style]} />
);

export const StyledText = ({ style, ...props }: TextProps) => (
  <Text {...props} style={[styles.styledText, style]} />
);

const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    borderWidth: theme.stroke.lg,
    backgroundColor: theme.colors.input,
  },
  textInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    textAlign: "center",
    color: "transparent",
  },
  absoluteContainer: {
    position: "absolute",
    left: 0,
    bottom: 0,
    top: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  styledText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontWeight: "bold",
    color: theme.colors.text,
    fontSize: isSmallDevice ? 24 : 30,
  },
}));
