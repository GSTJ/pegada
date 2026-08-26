import type { TextProps } from "@/components/text";
import type { LottieViewProps } from "lottie-react-native";

import type { ScrollViewProps, ViewProps } from "react-native";

import { ScrollView, View } from "react-native";

import LottieView from "lottie-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";

/** Lottie is not autoprocessed, so the sheet reaches it wrapped. */
const ThemedLottieView = withUnistyles(LottieView);

/** Every one of these was a static `.attrs`, which beat the caller's prop. */
type IllustrationProps = Omit<LottieViewProps, "source">;

const CONTENT_CONTAINER_STYLE = { flex: 1 };

/**
 * This boundary can replace the whole navigation tree, so nothing themed
 * renders behind it — without its own background the text sits directly on
 * the native window, which can be a mismatched backdrop (e.g. black while
 * the JS theme is light). Painting the theme background keeps text and
 * backdrop always coming from the same theme.
 */
export const Container = ({ style, ...props }: ScrollViewProps) => (
  <ScrollView
    {...props}
    contentContainerStyle={CONTENT_CONTAINER_STYLE}
    style={[styles.container, style]}
  />
);

export const Content = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.content, style]} />
);

export const Title = ({ style, ...props }: TextProps) => (
  <Text
    {...props}
    fontSize="lg"
    fontWeight="bold"
    style={[styles.title, style]}
  />
);

export const ContainedText = ({ style, ...props }: TextProps) => (
  <Text {...props} style={[styles.containedText, style]} />
);

export const DisconnectedIllustration = ({
  style,
  ...props
}: IllustrationProps) => (
  <ThemedLottieView
    {...props}
    autoPlay
    loop
    source={require("@/assets/animations/disconnected.json")}
    style={[styles.disconnectedIllustration, style]}
  />
);

/**
 * The `.attrs` also set `delay: 2000`, which Lottie has no such prop for —
 * styled-components let the extra attr through and the view dropped it. It is
 * gone rather than carried over as a lie.
 */
export const ErrorIllustration = ({ style, ...props }: IllustrationProps) => (
  <ThemedLottieView
    {...props}
    autoPlay
    loop
    source={require("@/assets/animations/error.json")}
    style={[styles.errorIllustration, style]}
  />
);

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
  },
  content: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: theme.spacing[5],
    paddingRight: theme.spacing[5],
    paddingBottom: theme.spacing[5],
    paddingLeft: theme.spacing[5],
    flexGrow: 1,
    flexShrink: 0,
    marginTop: 0,
    marginRight: theme.spacing[6],
    marginBottom: 0,
    marginLeft: theme.spacing[6],
  },
  title: {
    textAlign: "center",
  },
  containedText: {
    maxWidth: 350,
    marginBottom: theme.spacing[6],
    textAlign: "center",
  },
  disconnectedIllustration: {
    width: 150,
    height: 150,
    alignSelf: "center",
  },
  errorIllustration: {
    height: 150,
    width: 150,
    alignSelf: "center",
  },
}));
