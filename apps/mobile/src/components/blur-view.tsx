import type { ComponentType, RefAttributes } from "react";

import type { BlurViewProps } from "expo-blur";

import { forwardRef } from "react";
import { Platform, View } from "react-native";

import { BlurView as ExpoBlurView } from "expo-blur";

import Color from "color";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

/**
 * Both branches are widened to one component type on purpose: `withUnistyles`
 * derives its mapper and ref types from `ComponentProps`/`ComponentRef`, and a
 * union of two component types collapses both of those to `never`.
 */
const ContainerComponent = (
  Platform.OS === "ios" ? ExpoBlurView : View
) as ComponentType<BlurViewProps & RefAttributes<View>>;

/** Only the styles are themed here; the blur props are constants. */
const Container = withUnistyles(ContainerComponent);

/**
 * The former `.attrs(getProps)`: the tint/intensity pair the theme decides.
 *
 * `tint` is pinned to the legacy "light"/"dark" values rather than
 * "prominent" or any "system*" tint on purpose — those follow the OS
 * appearance (`UITraitCollection`), not `theme.dark`. When the app is forced
 * to (or stuck on) one theme while the system runs the other — the whole
 * point of `theme.dark` existing — a system-following tint renders glass in
 * the wrong theme's color even though every other themed color is correct.
 */
const ThemedContainer = withUnistyles(ContainerComponent, (theme) => ({
  tint: theme.dark ? ("dark" as const) : ("light" as const),
  intensity: theme.dark ? 70 : 40,
}));

/**
 * We want to blur the background on iOS, but not on Android
 * as this is closer to the native experience.
 * Especially because it was blurring wrong on Android, making the
 * content inside the container blurry as well sometimes and bugging
 * navigation
 */
export const BlurView = forwardRef<View, BlurViewProps>(
  ({ style, ...props }, ref) => (
    <ThemedContainer {...props} ref={ref} style={[styles.blurView, style]} />
  ),
);

BlurView.displayName = "BlurView";

/**
 * Falls back to at least a cool transparent background on Android
 */
export const TransparentAndroidDarkBlurView = forwardRef<View, BlurViewProps>(
  ({ style, ...props }, ref) => (
    <Container
      {...props}
      ref={ref}
      intensity={90}
      tint="dark"
      style={[styles.transparentAndroidDarkBlurView, style]}
    />
  ),
);

TransparentAndroidDarkBlurView.displayName = "TransparentAndroidDarkBlurView";

const TRANSPARENT_ANDROID_DARK_BLUR_VIEW_BACKGROUND_COLOR = "#00000090";

const styles = StyleSheet.create((theme) => ({
  blurView: {
    backgroundColor:
      Platform.OS === "android"
        ? theme.colors.background
        : new Color(theme.colors.background).alpha(0.5).string(),
  },
  transparentAndroidDarkBlurView: {
    backgroundColor:
      Platform.OS === "android"
        ? TRANSPARENT_ANDROID_DARK_BLUR_VIEW_BACKGROUND_COLOR
        : new Color(theme.colors.black).alpha(0.5).string(),
  },
}));
