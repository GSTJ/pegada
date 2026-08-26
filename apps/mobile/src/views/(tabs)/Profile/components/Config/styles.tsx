import type { TextProps } from "@/components/text";

import type {
  PressableProps,
  StyleProp,
  ViewProps,
  ViewStyle,
} from "react-native";

import { Pressable, View } from "react-native";

import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

/** `Pressable` also accepts a style callback; composing needs a plain style. */
type RootProps = { style?: StyleProp<ViewStyle> } & Omit<
  PressableProps,
  "style"
>;

/**
 * These stay components: `index.tsx` bundles them into the `Config` namespace
 * and the profile screen renders every one of them from the outside.
 */
export const Root = ({ style, ...props }: RootProps) => (
  <Pressable {...props} style={[styles.root, style]} />
);

export const Container = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.container, style]} />
);

/** Fixed-width slot so every row's icon lines up, whatever its own size. */
export const IconSlot = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.iconSlot, style]} />
);

export const ArrowContainer = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.arrowContainer, style]} />
);

/**
 * Both declared nothing but `.attrs(props => ({ …, ...props }))`, so they carry
 * no styles at all — only typography defaults the caller still wins against.
 */
export const Title = (props: TextProps) => (
  <Text numberOfLines={1} fontWeight="semibold" fontSize="sm" {...props} />
);

export const Description = (props: TextProps) => (
  <Text numberOfLines={2} fontSize="xs" {...props} />
);

const styles = StyleSheet.create((theme) => ({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3.5],
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
  },
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  iconSlot: {
    width: 22,
    alignItems: "center",
  },
  arrowContainer: {
    alignItems: "flex-end",
  },
}));
