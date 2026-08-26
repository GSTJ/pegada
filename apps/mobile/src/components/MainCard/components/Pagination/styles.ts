import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { TransparentAndroidDarkBlurView } from "@/components/blur-view";

const DOT_BACKGROUND_COLOR = "#fff";

export const styles = StyleSheet.create((theme) => ({
  content: {
    paddingTop: theme.spacing[1],
    paddingRight: theme.spacing[1],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[1],
    marginBottom: "auto",
    alignItems: "center",
  },
  container: {
    borderTopLeftRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginBottom: "auto",
    alignSelf: "flex-end",
    width: 24,
    overflow: "hidden",
  },
  dot: {
    backgroundColor: DOT_BACKGROUND_COLOR,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginTop: theme.spacing[1],
    marginRight: theme.spacing[1],
    marginBottom: theme.spacing[1],
    marginLeft: theme.spacing[1],
    variants: {
      active: {
        true: {
          opacity: 1,
        },
        default: {
          opacity: 0.6,
        },
      },
    },
  },
}));

export const Container = withUnistyles(TransparentAndroidDarkBlurView);
