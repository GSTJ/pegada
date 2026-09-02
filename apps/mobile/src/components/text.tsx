import type { UnistylesThemes } from "react-native-unistyles";

import type { TextProps as NativeTextProps } from "react-native";

import { Text as NativeText } from "react-native";

import { StyleSheet } from "react-native-unistyles";

type AppTheme = UnistylesThemes["light"];

export type TextProps = {
  fontSize?: keyof AppTheme["typography"]["sizes"];
  color?: keyof AppTheme["colors"];
  fontWeight?: keyof AppTheme["typography"]["fontFamily"];
} & NativeTextProps;

/**
 * The app's only text primitive: theme keys in, resolved typography out.
 *
 * It stays a component rather than becoming a bare stylesheet because ~40
 * modules build on it — `styled(Text)` on the pre-migration side, a plain
 * `const Title = Text` alias on the converted one — and both need something
 * they can render. The three theme-key props are Unistyles variants, so a
 * theme switch re-resolves them without the call sites knowing anything
 * changed.
 */
export const Text = ({
  color,
  fontSize,
  fontWeight,
  style,
  ...props
}: TextProps) => {
  styles.useVariants({ color, fontSize, fontWeight });

  return <NativeText {...props} style={[styles.text, style]} />;
};

const styles = StyleSheet.create((theme) => ({
  text: {
    variants: {
      color: {
        transparent: { color: theme.colors.transparent },
        black: { color: theme.colors.black },
        white: { color: theme.colors.white },
        premium: { color: theme.colors.premium },
        primary: { color: theme.colors.primary },
        secondary: { color: theme.colors.secondary },
        background: { color: theme.colors.background },
        surfaceElevated: { color: theme.colors.surfaceElevated },
        text: { color: theme.colors.text },
        subtitle: { color: theme.colors.subtitle },
        card: { color: theme.colors.card },
        placeholder: { color: theme.colors.placeholder },
        accent: { color: theme.colors.accent },
        destructive: { color: theme.colors.destructive },
        border: { color: theme.colors.border },
        input: { color: theme.colors.input },
        default: { color: theme.colors.text },
      },
      fontWeight: {
        light: {
          fontFamily: theme.typography.fontFamily.light,
          fontWeight: "light",
        },
        medium: {
          fontFamily: theme.typography.fontFamily.medium,
          fontWeight: "medium",
        },
        regular: {
          fontFamily: theme.typography.fontFamily.regular,
          fontWeight: "regular",
        },
        semibold: {
          fontFamily: theme.typography.fontFamily.semibold,
          fontWeight: "semibold",
        },
        bold: {
          fontFamily: theme.typography.fontFamily.bold,
          fontWeight: "bold",
        },
        black: {
          fontFamily: theme.typography.fontFamily.black,
          fontWeight: "black",
        },
        default: {
          fontFamily: theme.typography.fontFamily.regular,
          fontWeight: "regular",
        },
      },
      fontSize: {
        xxxl: { fontSize: theme.typography.sizes.xxxl.size },
        xxl: { fontSize: theme.typography.sizes.xxl.size },
        xl: { fontSize: theme.typography.sizes.xl.size },
        lg: { fontSize: theme.typography.sizes.lg.size },
        md: { fontSize: theme.typography.sizes.md.size },
        sm: { fontSize: theme.typography.sizes.sm.size },
        xs: { fontSize: theme.typography.sizes.xs.size },
        xxs: { fontSize: theme.typography.sizes.xxs.size },
        default: { fontSize: theme.typography.sizes.md.size },
      },
    },
  },
}));
