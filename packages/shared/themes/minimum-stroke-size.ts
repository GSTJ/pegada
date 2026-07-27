import type { StyleSheet as RNStyleSheet } from "react-native";

/**
 * Running on React Native, where `navigator.product` is "ReactNative".
 *
 * The lookup goes through `globalThis` on purpose: this package is compiled
 * without the DOM lib, so a bare `navigator` does not resolve, and the file
 * previously papered over that with a `@ts-ignore-next-line`. oxlint rewrote
 * that to `@ts-expect-error`, tsc then reported it as unused, and the honest
 * fix is to type the one property being read instead of suppressing the line.
 */
const isReactNative =
  (globalThis as { navigator?: { product?: string } }).navigator?.product ===
  "ReactNative";

// Requiring the StyleSheet directly from react-native won't break here.
const nativeStyleSheet = isReactNative
  ? (require("react-native") as { StyleSheet: typeof RNStyleSheet }).StyleSheet
  : undefined;

export const minimumStrokeSize = nativeStyleSheet?.hairlineWidth ?? 1;
