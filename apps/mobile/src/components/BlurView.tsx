import { Platform, View } from "react-native";
import { BlurViewProps, BlurView as ExpoBlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import Color from "color";
import styled, { DefaultTheme } from "styled-components/native";

type MixinProps = { theme: DefaultTheme } & BlurViewProps;

const getProps = (props: MixinProps) => ({
  tint: "prominent",
  intensity: props.theme.dark ? 70 : 40,
  ...props,
});

const ContainerComponent = Platform.OS === "ios" ? ExpoBlurView : View;
/**
 * We want to blur the background on iOS, but not on Android
 * as this is closer to the native experience.
 * Especially because it was blurring wrong on Android, making the
 * content inside the container blurry as well sometimes and bugging
 * navigation
 */
export const BlurView = styled(ContainerComponent).attrs(getProps)<BlurViewProps>`
  background-color: ${(props) => {
    if (Platform.OS === "android") return props.theme.colors.background;
    return Color(props.theme.colors.background).alpha(0.5).string();
  }};
`;

/**
 * Falls back to at least a cool transparent background on Android
 */
export const TransparentAndroidDarkBlurView = styled(ContainerComponent).attrs({
  intensity: 90,
  tint: "dark",
})`
  background-color: ${(props) => {
    if (Platform.OS === "android") return "#00000090";
    return Color(props.theme.colors.black).alpha(0.5).string();
  }};
`;

let cachedGlassAvailable: boolean | undefined;

/**
 * `isLiquidGlassAvailable()` calls `requireNativeModule('ExpoGlassEffect')`
 * under the hood, which throws synchronously if the native module isn't
 * linked. It must never run at module scope -- a throw during module
 * evaluation crashes app boot with no redbox recovery. Evaluate lazily on
 * first use instead, and treat a missing/broken native module as "not
 * available" so we degrade to the non-glass fallback.
 */
export const isLiquidGlassAvailableSafe = (): boolean => {
  if (cachedGlassAvailable === undefined) {
    try {
      cachedGlassAvailable = isLiquidGlassAvailable();
    } catch {
      cachedGlassAvailable = false;
    }
  }
  return cachedGlassAvailable;
};

/**
 * Same intent as `TransparentAndroidDarkBlurView` (a dark, translucent
 * pill floating over a photo), but rendered as real Liquid Glass on iOS 26+.
 * Falls back to the existing blur-on-iOS/flat-on-Android behavior everywhere
 * else, so older iOS and Android are pixel-for-pixel unchanged.
 */
const StyledGlassView = styled(GlassView).attrs({
  glassEffectStyle: "clear",
  colorScheme: "dark",
})``;

export const TransparentGlassOrDarkBlurView: React.FC<BlurViewProps> = (props) =>
  isLiquidGlassAvailableSafe() ? (
    <StyledGlassView {...props} />
  ) : (
    <TransparentAndroidDarkBlurView {...props} />
  );
