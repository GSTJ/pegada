import type { TextStyle, ViewStyle } from "react-native";

import { StyleSheet } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import Color from "color";
import clamp from "lodash/clamp";
import {
  StyleSheet as UnistylesStyleSheet,
  withUnistyles,
} from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";
import { height, width } from "@/constants";

const ASPECT_RATIO = 4 / 3;
const MAX_HEIGHT = height * 0.5;
const MIN_HEIGHT = height * 0.4;
const IDEAL_HEIGHT = width * ASPECT_RATIO;

export const CARD_HEIGHT = clamp(IDEAL_HEIGHT, MIN_HEIGHT, MAX_HEIGHT);
/**
 * `@react-navigation` header slots take style props rather than components, so
 * the static half of each one lives in a sheet and the themed half stays inline.
 *
 * The explicit type argument is load-bearing, not decoration. `fontWeight:
 * "bold"` widens to `string` in a fresh object literal, which does not satisfy
 * `NamedStyles<T>`, so inference falls back to the other half of the
 * constraint — `NamedStyles<any>` — and every key comes back as
 * `ViewStyle | TextStyle | ImageStyle`. The header props then reject it.
 */
export const { headerLeft, headerRight, headerTitle } = StyleSheet.create<{
  headerLeft: ViewStyle;
  headerRight: ViewStyle;
  headerTitle: TextStyle;
}>({
  headerLeft: { paddingLeft: 16 },
  headerRight: { paddingRight: 16 },
  headerTitle: { fontWeight: "bold" },
});

export const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
  },
  bottomColumn: {},
  content: {
    paddingTop: 0,
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    marginTop: -theme.spacing[2],
  },
  shareButton: {
    alignSelf: "center",
  },
  reportButton: {
    alignSelf: "center",
  },
  matchActionBarGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  unmatchButton: {
    alignSelf: "center",
  },
  name: {
    marginBottom: theme.spacing[1],
  },
  age: {
    marginBottom: theme.spacing[1],
    fontSize: 18,
  },
  description: {
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[12],
  },
  actionLabel: {
    textAlign: "center",
  },
  errorScreen: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
}));

export const ShareButton = withUnistyles(PressableArea);

export const ReportButton = withUnistyles(PressableArea);

export const MatchActionBarGradient = withUnistyles(LinearGradient, (theme) => {
  const gradientColor = new Color(theme.colors.background);

  return {
    colors: [
      gradientColor.fade(1).rgb().string(),
      gradientColor.fade(0.2).rgb().string(),
      gradientColor.fade(0.2).rgb().string(),
      gradientColor.fade(0).rgb().string(),
    ],
    pointerEvents: "none",
  } as const;
});

export const UnmatchButton = withUnistyles(PressableArea);

export const Name = Text;

export const Age = Text;

export const Description = Text;

export const ActionLabel = Text;
