import type { ViewStyle } from "react-native";

import { StyleSheet } from "react-native";

import {
  StyleSheet as UnistylesStyleSheet,
  withUnistyles,
} from "react-native-unistyles";

import Information from "@/assets/images/Information.svg";
import Location from "@/assets/images/Location.svg";
import { Text } from "@/components/text";

/**
 * `contentContainerStyle` is a plain style prop, not a component, so it cannot
 * be a styled component — the only way to keep it out of the JSX is a sheet.
 *
 * The explicit type argument is load-bearing: `justifyContent: "center"` widens
 * to `string` in a fresh object literal, which does not satisfy
 * `NamedStyles<T>`, so inference falls back to `NamedStyles<any>` and hands
 * back `ViewStyle | TextStyle | ImageStyle`, which `contentContainerStyle`
 * rejects.
 */
export const { scrollContent } = StyleSheet.create<{
  scrollContent: ViewStyle;
}>({
  scrollContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  locationView: {
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 250,
  },
  bottomView: {
    borderTopColor: theme.colors.border,
    borderTopWidth: theme.stroke.md,
    paddingTop: 20,
    paddingRight: theme.spacing[6],
    paddingBottom: theme.spacing[6],
    paddingLeft: theme.spacing[6],
  },
  informationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  locationIcon: {
    marginBottom: 20,
  },
  informationIcon: {
    width: 21,
    height: 21,
    marginRight: 10,
  },
  title: {
    textAlign: "center",
    marginBottom: 4,
  },
  prompt: {
    textAlign: "center",
  },
}));

export const LocationIcon = withUnistyles(Location);

export const InformationIcon = withUnistyles(Information);

export const Title = Text;

export const Prompt = Text;
