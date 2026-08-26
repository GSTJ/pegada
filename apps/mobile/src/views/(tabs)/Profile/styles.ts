import { StyleSheet } from "react-native";

import Color from "color";
import {
  StyleSheet as UnistylesStyleSheet,
  withUnistyles,
} from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";

/** `contentContainerStyle` takes a style object, not a component. */
export const { settingsScroll } = StyleSheet.create({
  settingsScroll: { flexGrow: 1, zIndex: 10 },
});

const BACKGROUND_PROFILE_CONTAINER_BACKGROUND_COLOR = "#000";

export const styles = UnistylesStyleSheet.create((theme) => ({
  planContainer: {
    position: "absolute",
    top: theme.spacing[4],
    right: theme.spacing[4],
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[3],
    paddingBottom: theme.spacing[2],
    paddingLeft: theme.spacing[3],
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
    backgroundColor: new Color(theme.colors.background).alpha(0.6).string(),
    zIndex: 10,
  },
  scrollContainer: {
    overflow: "hidden",
  },
  settingsList: {
    flexGrow: 1,
    backgroundColor: "transparent",
  },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundProfileContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: BACKGROUND_PROFILE_CONTAINER_BACKGROUND_COLOR,
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BACKGROUND_PROFILE_CONTAINER_BACKGROUND_COLOR,
  },
  content: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    borderBottomColor: theme.colors.border,
    borderBottomWidth: theme.stroke.sm,
    backgroundColor: theme.colors.background,
  },
  settingsBlock: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing[1],
    flexGrow: 1,
  },
}));

export const PlanContainer = withUnistyles(PressableArea);
