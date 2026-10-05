import * as React from "react";
import { Platform, View } from "react-native";
import { BlurViewProps, BlurView as ExpoBlurView } from "expo-blur";
import type { GlassViewProps } from "expo-glass-effect";
import Color from "color";
import styled, { DefaultTheme, useTheme } from "styled-components/native";

import {
  type BlurEffectPolicy,
  type BlurSurfaceMode,
  type ReduceTransparencyPreference,
  resolveBlurSurfaceMode,
} from "@/services/blurSurfaceMode";
import { useReduceTransparencyEnabled } from "@/services/reduceTransparency";

export type { BlurEffectPolicy, BlurSurfaceMode } from "@/services/blurSurfaceMode";

type MixinProps = { theme: DefaultTheme } & BlurViewProps;

export interface PegadaBlurViewProps extends BlurViewProps {
  /** Render an effect-free surface when an ancestor animates opacity. */
  blurEffectPolicy?: BlurEffectPolicy;
  /** Enable native touch response for glass inside an interactive control. */
  liquidGlassInteractive?: boolean;
}

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

const OpaqueBlurView = styled(View)`
  background-color: ${(props) => props.theme.colors.background};
`;

const FlatBlurView = styled(View)`
  background-color: ${(props) =>
    Platform.OS === "android"
      ? props.theme.colors.background
      : Color(props.theme.colors.background).alpha(0.82).string()};
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

const OpaqueDarkSurface = styled(View)`
  background-color: ${(props) => props.theme.colors.black};
`;

const FlatDarkSurface = styled(View)`
  background-color: ${(props) => Color(props.theme.colors.black).alpha(0.5).string()};
`;

type GlassEffectModule = Pick<
  typeof import("expo-glass-effect"),
  "GlassView" | "isGlassEffectAPIAvailable" | "isLiquidGlassAvailable"
>;

let cachedGlassEffectModule: GlassEffectModule | null | undefined;
let cachedGlassAvailable: boolean | undefined;

const getGlassEffectModuleSafe = (): GlassEffectModule | null => {
  if (cachedGlassEffectModule === undefined) {
    try {
      // Keep this require inside the guard. GlassView.ios calls
      // requireNativeViewManager while its module is evaluated, so a static
      // import would throw before isLiquidGlassAvailableSafe() could fall back.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cachedGlassEffectModule = require("expo-glass-effect") as GlassEffectModule;
    } catch {
      cachedGlassEffectModule = null;
    }
  }

  return cachedGlassEffectModule;
};

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
      const glassEffectModule = getGlassEffectModuleSafe();
      cachedGlassAvailable = Boolean(
        glassEffectModule?.isLiquidGlassAvailable() &&
        glassEffectModule.isGlassEffectAPIAvailable(),
      );
    } catch {
      cachedGlassAvailable = false;
    }
  }
  return cachedGlassAvailable;
};

export interface LiquidGlassStatus {
  liquidGlassAvailable: boolean;
  reduceTransparencyEnabled: ReduceTransparencyPreference;
}

export { useReduceTransparencyEnabled } from "@/services/reduceTransparency";

export const useLiquidGlassStatus = (): LiquidGlassStatus => {
  const reduceTransparencyEnabled = useReduceTransparencyEnabled();
  const liquidGlassAvailable =
    Platform.OS === "ios" && reduceTransparencyEnabled === false && isLiquidGlassAvailableSafe();

  return { liquidGlassAvailable, reduceTransparencyEnabled };
};

export const useLiquidGlassAvailable = (): boolean => useLiquidGlassStatus().liquidGlassAvailable;

export const useResolvedBlurSurfaceMode = (
  effectPolicy: BlurEffectPolicy = "stable",
): BlurSurfaceMode => {
  const { liquidGlassAvailable, reduceTransparencyEnabled } = useLiquidGlassStatus();

  return resolveBlurSurfaceMode({
    effectPolicy,
    liquidGlassAvailable,
    reduceTransparencyEnabled,
  });
};

const BlurSurfaceModeContext = React.createContext<BlurSurfaceMode>("legacy");

/** Lets compound blur components use the exact mode chosen by BlurView. */
export const useBlurSurfaceMode = (): BlurSurfaceMode => React.useContext(BlurSurfaceModeContext);

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
 * GlassView without a module-scope native view-manager lookup. Callers only
 * render it after the shared surface policy resolves to `glass`; returning
 * null here is a final guard for stale OTA/native-runtime combinations.
 */
export const LiquidGlassView = React.forwardRef<View, GlassViewProps>((props, ref) => {
  const NativeGlassView = getGlassEffectModuleSafe()?.GlassView;
  if (!NativeGlassView) return null;

  return <NativeGlassView {...props} ref={ref} />;
});

LiquidGlassView.displayName = "LiquidGlassView";

/**
 * Uses native Liquid Glass for every existing blur-backed surface on iOS 26.
 * The public props stay compatible with expo-blur so current callers and
 * styled-components wrappers keep their layout and refs unchanged.
 */
export const BlurView = React.forwardRef<View, PegadaBlurViewProps>((props, ref) => {
  const theme = useTheme();
  const { blurEffectPolicy = "stable", liquidGlassInteractive = false, ...blurViewProps } = props;
  const mode = useResolvedBlurSurfaceMode(blurEffectPolicy);

  const surface = (() => {
    if (mode === "glass") {
      return (
        <LiquidGlassView
          {...getGlassCompatibleProps(blurViewProps)}
          ref={ref}
          glassEffectStyle="regular"
          colorScheme={theme.dark ? "dark" : "light"}
          isInteractive={liquidGlassInteractive}
        />
      );
    }

    if (mode === "opaque") {
      return <OpaqueBlurView {...getGlassCompatibleProps(blurViewProps)} ref={ref} />;
    }

    if (mode === "flat") {
      return <FlatBlurView {...getGlassCompatibleProps(blurViewProps)} ref={ref} />;
    }

    return <FallbackBlurView {...blurViewProps} ref={ref} />;
  })();

  return <BlurSurfaceModeContext.Provider value={mode}>{surface}</BlurSurfaceModeContext.Provider>;
});

BlurView.displayName = "BlurView";

/**
 * Same intent as `TransparentAndroidDarkBlurView` (a dark, translucent
 * pill floating over a photo), but rendered as real Liquid Glass on iOS 26+.
 * With Reduce Transparency off, older iOS and Android keep their existing
 * blur-on-iOS/flat-on-Android behavior.
 */
const StyledGlassView = styled(LiquidGlassView)``;

export const TransparentGlassOrDarkBlurView = React.forwardRef<View, PegadaBlurViewProps>(
  (props, ref) => {
    const { blurEffectPolicy = "stable", liquidGlassInteractive, ...blurViewProps } = props;
    const mode = useResolvedBlurSurfaceMode(blurEffectPolicy);

    const surface = (() => {
      if (mode === "glass") {
        return (
          <StyledGlassView
            {...getGlassCompatibleProps(blurViewProps)}
            ref={ref}
            glassEffectStyle="clear"
            colorScheme="dark"
            isInteractive={liquidGlassInteractive}
          />
        );
      }

      if (mode === "opaque") {
        return <OpaqueDarkSurface {...getGlassCompatibleProps(blurViewProps)} ref={ref} />;
      }

      if (mode === "flat") {
        return <FlatDarkSurface {...getGlassCompatibleProps(blurViewProps)} ref={ref} />;
      }

      return <TransparentAndroidDarkBlurView {...blurViewProps} ref={ref} />;
    })();

    return (
      <BlurSurfaceModeContext.Provider value={mode}>{surface}</BlurSurfaceModeContext.Provider>
    );
  },
);

TransparentGlassOrDarkBlurView.displayName = "TransparentGlassOrDarkBlurView";
