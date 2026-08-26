import { StyleSheet } from "react-native";

import {
  StyleSheet as UnistylesStyleSheet,
  withUnistyles,
} from "react-native-unistyles";

import { Image } from "@/components/image";
import { PressableArea } from "@/components/pressable-area";

export const PICTURE_SIZE = 55;
/**
 * The emoji component is picked at runtime (or is null), so it cannot be a
 * styled component — a sheet entry is the only way to keep the size out of JSX.
 */
export const { emojiSize } = StyleSheet.create({
  emojiSize: { width: 15, height: 15 },
});

export const styles = UnistylesStyleSheet.create((theme) => ({
  container: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    flexDirection: "row",
    alignItems: "center",
  },
  picture: {
    width: PICTURE_SIZE,
    height: PICTURE_SIZE,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    marginRight: theme.spacing[3.5],
    backgroundColor: theme.colors.card,
  },
  emojiContainer: {
    position: "absolute",
    bottom: -theme.spacing[1],
    right: theme.spacing[1],
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    paddingTop: theme.spacing[1],
    paddingRight: theme.spacing[1],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[1],
    borderWidth: theme.stroke.md,
    borderColor: theme.colors.border,
  },
}));

export const Container = withUnistyles(PressableArea);

export const Picture = withUnistyles(Image);
