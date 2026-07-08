import { Platform } from "react-native";

import AndroidTabsLayout from "./AndroidTabsLayout";
import IOSNativeTabsLayout from "./IOSNativeTabsLayout";

/**
 * Tab bar rendering is platform-split on purpose:
 *
 * - iOS uses expo-router's Native Tabs (`expo-router/unstable-native-tabs`),
 *   which hands the tab bar to UIKit. On iOS 26 that means Liquid Glass for
 *   free, with zero extra work.
 * - Android keeps the existing JS `Tabs`. Native Tabs on Android render as a
 *   plain Material 3 bottom nav and would cost us the fine-grained
 *   `theme.spacing`/safe-area-driven bar insets and the gradient brand icons
 *   we render today (Native Tabs icons only accept SF Symbols / xcasset /
 *   drawable / material glyphs / static image sources, not arbitrary SVG
 *   element trees) -- a straight downgrade with nothing gained, since Liquid
 *   Glass itself is iOS 26-only. See the PR description for the full
 *   comparison.
 */
export default Platform.OS === "ios" ? IOSNativeTabsLayout : AndroidTabsLayout;
