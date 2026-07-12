import * as React from "react";
import { Platform, View } from "react-native";
import { BlurViewProps, BlurView as ExpoBlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import Color from "color";
import styled, { DefaultTheme, useTheme } from "styled-components/native";

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
const FallbackBlurView = styled(ContainerComponent).attrs(getProps)<BlurViewProps>`
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
      cachedGlassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
    } catch {
      cachedGlassAvailable = false;
    }
  }
  return cachedGlassAvailable;
};

const getGlassCompatibleProps = (props: BlurViewProps) => {
  const viewProps = { ...props };
  delete viewProps.blurTarget;
  delete viewProps.tint;
  delete viewProps.intensity;
  delete viewProps.blurReductionFactor;
  delete viewProps.experimentalBlurMethod;
  delete viewProps.blurMethod;
  return viewProps;
};

/**
 * Uses native Liquid Glass for every existing blur-backed surface on iOS 26.
 * The public props stay compatible with expo-blur so current callers and
 * styled-components wrappers keep their layout and refs unchanged.
 */
export const BlurView = React.forwardRef<View, BlurViewProps>((props, ref) => {
  const theme = useTheme();

  if (isLiquidGlassAvailableSafe()) {
    return (
      <GlassView
        {...getGlassCompatibleProps(props)}
        key={theme.dark ? "glass-dark" : "glass-light"}
        ref={ref}
        glassEffectStyle="regular"
        colorScheme={theme.dark ? "dark" : "light"}
      />
    );
  }

  return <FallbackBlurView {...props} ref={ref} />;
});

BlurView.displayName = "BlurView";

/**
 * Same intent as `TransparentAndroidDarkBlurView` (a dark, translucent
 * pill floating over a photo), but rendered as real Liquid Glass on iOS 26+.
 * Falls back to the existing blur-on-iOS/flat-on-Android behavior everywhere
 * else, so older iOS and Android are pixel-for-pixel unchanged.
 */
const StyledGlassView = styled(GlassView)``;

export const TransparentGlassOrDarkBlurView = React.forwardRef<View, BlurViewProps>(
  (props, ref) => {
    const theme = useTheme();

    return isLiquidGlassAvailableSafe() ? (
      <StyledGlassView
        key={theme.dark ? "photo-glass-dark" : "photo-glass-light"}
        ref={ref}
        glassEffectStyle="clear"
        colorScheme={theme.dark ? "dark" : "light"}
        {...getGlassCompatibleProps(props)}
      />
    ) : (
      <TransparentAndroidDarkBlurView {...props} ref={ref} />
    );
  },
);

TransparentGlassOrDarkBlurView.displayName = "TransparentGlassOrDarkBlurView";
