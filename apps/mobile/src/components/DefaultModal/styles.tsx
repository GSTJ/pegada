import type { ButtonProps } from "@/components/Button";
import type { TextProps } from "@/components/text";

import type { StyleProp, ViewProps, ViewStyle } from "react-native";

import { View } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";
import { Text } from "@/components/text";

/** `Button` renders a `PressableArea`, which is not autoprocessed. */
const ThemedButton = withUnistyles(Button);

/**
 * The modal shell every "title, description, one button" dialog reuses.
 * `LikeLimitReached` renders all four from the outside — `Container` through
 * `withUnistyles` — so they stay components and keep their `.attrs` defaults.
 */
/** `Pressable` also accepts a style callback; composing needs a plain style. */
type OkButtonProps = { style?: StyleProp<ViewStyle> } & Omit<
  ButtonProps,
  "style"
>;

export const OkButton = ({ style, ...props }: OkButtonProps) => (
  <ThemedButton {...props} style={[styles.okButton, style]} />
);

export const Container = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.container, style]} />
);

/** The typography props were `.attrs(props => ({…, ...props}))`: callers win. */
export const Title = ({ style, ...props }: TextProps) => (
  <Text
    fontWeight="bold"
    fontSize="lg"
    {...props}
    style={[styles.title, style]}
  />
);

export const Description = ({ style, ...props }: TextProps) => (
  <Text {...props} style={[styles.description, style]} />
);

const styles = StyleSheet.create((theme) => ({
  okButton: {
    width: "100%",
    marginTop: theme.spacing[4],
  },
  container: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing[6],
    paddingRight: theme.spacing[6],
    paddingBottom: theme.spacing[6],
    paddingLeft: theme.spacing[6],
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginTop: theme.spacing[6],
    marginRight: theme.spacing[6],
    marginBottom: theme.spacing[6],
    marginLeft: theme.spacing[6],
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
  },
}));
