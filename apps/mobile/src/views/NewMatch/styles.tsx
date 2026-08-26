import type { LocalImageProps } from "@/components/image";
import type { AnimatedProps } from "react-native-reanimated";

import Color from "color";
import AnimatedLottieView from "lottie-react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  useUnistyles,
  withUnistyles,
} from "react-native-unistyles";

import { Image } from "@/components/image";
import { Text } from "@/components/text";

/** `react-native-safe-area-context` is not on the autoprocess list. */
export const Content = withUnistyles(SafeAreaView);

const AnimatedImage = Animated.createAnimatedComponent(Image);

type RotatedImageProps = AnimatedProps<LocalImageProps>;

/**
 * The rotating cards are the one place neither Unistyles wrapper fits.
 *
 * `withUnistyles` is out because it flattens the `style` array into a single
 * object, which would collapse the animated style `animated-cards.tsx` passes
 * in. `createUnistylesElement` — what the babel plugin applies to
 * `Animated.View` — is out too, and less obviously: it registers the node's ref
 * with `UnistylesShadowRegistry`, and `expo-image` hands back the `ExpoImage`
 * class instance rather than a host view, so the registry finds no shadow node
 * and throws. Inside a ref callback that lands on the nearest error boundary,
 * which is why the card stack rendered as the bare heart-eyes fallback.
 *
 * So the sheet travels down `style`, first in the array, exactly as
 * styled-components delivered it. The one thing the shadow registration bought
 * was re-resolving the sheet on a theme switch without a render; `useUnistyles`
 * buys the same thing back with one — reading a theme property subscribes this
 * component, and the next render re-reads `styles`, which Unistyles rebuilds
 * for the new theme on access.
 */
const useThemedSheet = () => {
  const { theme } = useUnistyles();

  // Touched for the subscription, not for the value: the read is what puts
  // `UnistyleDependency.Theme` in this component's dependency set.
  void theme.colors;

  return styles;
};

/** The caller's animated style stays last in the array, so it still wins. */
export const RotatedImageLeft = ({ style, ...props }: RotatedImageProps) => {
  const sheet = useThemedSheet();

  return <AnimatedImage {...props} style={[sheet.rotatedImageLeft, style]} />;
};

/** `styled(RotatedImageLeft)`: the same declarations plus `position`. */
export const RotatedImageRight = ({ style, ...props }: RotatedImageProps) => {
  const sheet = useThemedSheet();

  return <AnimatedImage {...props} style={[sheet.rotatedImageRight, style]} />;
};

/** `expo-image` is not autoprocessed either, and it carries no animation. */
export const HeartEyesEmoji = withUnistyles(Image);

/** Same emoji, standing in for the whole card stack when it fails to load. */
export const HeartEyesEmojiStandalone = withUnistyles(Image);

export const MatchWordmark = withUnistyles(Image);

export const MatchCaption = Text;

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
