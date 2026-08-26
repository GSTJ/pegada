import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { BlurView } from "@/components/blur-view";

export const styles = StyleSheet.create((theme) => ({
  container: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderColor: theme.colors.border,
    borderTopWidth: theme.stroke.md,
  },
}));

export const Container = withUnistyles(BlurView);
