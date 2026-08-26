import type { LocalImageProps } from "@/components/image";
import type { AnimatedProps } from "react-native-reanimated";

import Color from "color";
import AnimatedLottieView from "lottie-react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createUnistylesElement,
  StyleSheet,
  withUnistyles,
} from "react-native-unistyles";

import { Image } from "@/components/image";
import { Text } from "@/components/text";

/** `react-native-safe-area-context` is not on the autoprocess list. */
export const Content = withUnistyles(SafeAreaView);

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * The rotating cards are the one place `withUnistyles` cannot be used:
 * it flattens the `style` array into a single object, which would collapse the
 * animated style `animated-cards.tsx` passes in. `createUnistylesElement` is
 * what the babel plugin applies to `Animated.View` and friends — it hands the
 * array through untouched and registers the node so a theme switch still
 * re-resolves the sheet.
 */
const ThemedAnimatedImage = createUnistylesElement(
  AnimatedImage,
) as typeof AnimatedImage;

type RotatedImageProps = AnimatedProps<LocalImageProps>;

/** The caller's animated style stays last in the array, so it still wins. */
export const RotatedImageLeft = ({ style, ...props }: RotatedImageProps) => (
  <ThemedAnimatedImage {...props} style={[styles.rotatedImageLeft, style]} />
);

/** `styled(RotatedImageLeft)`: the same declarations plus `position`. */
export const RotatedImageRight = ({ style, ...props }: RotatedImageProps) => (
  <ThemedAnimatedImage {...props} style={[styles.rotatedImageRight, style]} />
);

/** `expo-image` is not autoprocessed either, and it carries no animation. */
export const HeartEyesEmoji = withUnistyles(Image);

/** Same emoji, standing in for the whole card stack when it fails to load. */
export const HeartEyesEmojiStandalone = withUnistyles(Image);

export const MatchWordmark = withUnistyles(Image);

export const MatchCaption = withUnistyles(Text);

export const Confetti = withUnistyles(AnimatedLottieView);

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    gap: 10,
  },
  rotatedImageLeft: {
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderBottomRightRadius: theme.radii.lg,
    borderBottomLeftRadius: theme.radii.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rotatedImageRight: {
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderBottomRightRadius: theme.radii.lg,
    borderBottomLeftRadius: theme.radii.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "absolute",
  },
  heartEyesContainer: {
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    backgroundColor: new Color(theme.colors.primary).alpha(0.5).rgb().string(),
    paddingTop: theme.spacing[1.5],
    paddingRight: theme.spacing[1.5],
    paddingBottom: theme.spacing[1.5],
    paddingLeft: theme.spacing[1.5],
    marginTop: -35,
    marginBottom: theme.spacing[2],
  },
  cardsColumn: {
    alignItems: "center",
  },
  heartEyesEmoji: {
    width: 70,
    height: 70,
  },
  heartEyesEmojiStandalone: {
    width: 70,
    height: 70,
    marginBottom: theme.spacing[5],
  },
  loadingBox: {
    height: 200,
  },
  /** `contentContainerStyle` takes a style object, not a component. */
  matchScroll: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  matchWordmark: {
    height: 50,
    width: "100%",
  },
  matchCaption: {
    textAlign: "center",
    marginTop: 12,
    maxWidth: 200,
  },
  confetti: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
  },
}));
