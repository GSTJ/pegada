import type { TextProps } from "@/components/text";

import type { PressableProps, StyleProp, ViewStyle } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";

type VariantProps = {
  variant?: "outline" | "default";
};
export type ContainerProps = {
  loading?: boolean;
} & VariantProps;

export const BUTTON_HEIGHT = 68;

/** `PressableArea` is not autoprocessed, so the sheet reaches it wrapped. */
const ThemedPressableArea = withUnistyles(PressableArea);

/** `Pressable` also accepts a style callback; composing needs a plain style. */
type ButtonContainerProps = { style?: StyleProp<ViewStyle> } & Omit<
  PressableProps,
  "style"
> &
  ContainerProps;

/**
 * Unistyles spells "no variant selected" `default`, which is also one of the
 * prop's own values. Both mean the filled button, so the prop's `"default"`
 * arrives as no value at all.
 */
const variantKey = (variant: VariantProps["variant"]) =>
  variant === "outline" ? ("outline" as const) : undefined;

/**
 * `Button` spreads its own props onto this, so the two prop conditionals stay
 * props: they select variants here rather than at the call site.
 */
export const Container = ({
  variant,
  disabled,
  style,
  ...props
}: ButtonContainerProps) => {
  // `disabled` is nullable on `Pressable`; the sheet only knows true or absent.
  styles.useVariants({
    variant: variantKey(variant),
    disabled: disabled ?? undefined,
  });

  return (
    <ThemedPressableArea
      {...props}
      disabled={disabled}
      style={[styles.container, style]}
    />
  );
};

export const ButtonText = ({
  variant,
  style,
  ...props
}: VariantProps & TextProps) => {
  styles.useVariants({ variant: variantKey(variant) });

  return <Text {...props} style={[styles.buttonText, style]} />;
};

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    height: BUTTON_HEIGHT,
    borderWidth: theme.stroke.xxl,
    borderColor: theme.colors.primary,
    variants: {
      variant: {
        outline: {},
        default: {
          backgroundColor: theme.colors.primary,
        },
      },
      disabled: {
        true: {
          opacity: 0.5,
        },
      },
    },
  },
  buttonText: {
    variants: {
      variant: {
        outline: {
          color: theme.colors.primary,
        },
        default: {
          color: "white",
        },
      },
    },
  },
}));
