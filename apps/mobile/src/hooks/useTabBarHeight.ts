import { useContext } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";

/**
 * Standard UITabBar content height in points. With iOS Native Tabs
 * (`expo-router/unstable-native-tabs`) UIKit owns the bar, so there is no
 * JS-provided height -- the visible bar is 49pt plus the bottom safe-area
 * inset (home indicator area).
 */
const IOS_NATIVE_TAB_BAR_HEIGHT = 49;

/**
 * Height of the bottom tab bar, safe under both tab implementations.
 *
 * - Android (JS `Tabs`): the Bottom Tab Navigator provides
 *   `BottomTabBarHeightContext`; its value is returned unchanged.
 * - iOS (Native Tabs): the context doesn't exist -- the upstream
 *   `useBottomTabBarHeight()` hook THROWS at mount -- so fall back to the
 *   standard UITabBar height plus the bottom safe-area inset.
 *
 * Never call `useBottomTabBarHeight()` from `@react-navigation/bottom-tabs`
 * directly in tab screens: it crashes every screen on iOS now that the tab
 * bar is native there.
 */
export const useTabBarHeight = (): number => {
  const jsTabBarHeight = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();

  if (jsTabBarHeight !== undefined) return jsTabBarHeight;
  if (Platform.OS === "ios") return IOS_NATIVE_TAB_BAR_HEIGHT + insets.bottom;
  return 0;
};

/**
 * How much of the screen's bottom edge the tab bar OVERLAYS.
 *
 * - iOS Native Tabs: screens extend under the translucent (Liquid Glass)
 *   bar. Scrollable content is meant to scroll under it -- that's the iOS 26
 *   aesthetic -- but interactive controls and end-of-scroll padding must
 *   clear the full bar height, which this hook returns.
 * - Android JS tabs: the bar sits in normal layout flow below the screen,
 *   so nothing is covered and this returns 0 (existing layouts unchanged).
 */
export const useTabBarOverlap = (): number => {
  const jsTabBarHeight = useContext(BottomTabBarHeightContext);
  const insets = useSafeAreaInsets();

  if (jsTabBarHeight === undefined && Platform.OS === "ios") {
    return IOS_NATIVE_TAB_BAR_HEIGHT + insets.bottom;
  }

  return 0;
};
