import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { TransparentAndroidDarkBlurView } from "@/components/blur-view";
import { Text } from "@/components/text";

const DISTANCE_TEXT_COLOR = "#fff";

export const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: 0,
    marginRight: theme.spacing[6],
    marginBottom: "auto",
    marginLeft: theme.spacing[6],
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  content: {
    paddingTop: theme.spacing[2.5],
    paddingRight: theme.spacing[2.5],
    paddingBottom: theme.spacing[2.5],
    paddingLeft: theme.spacing[2.5],
    alignItems: "center",
    flexDirection: "row",
  },
  distanceText: {
    marginLeft: theme.spacing[1],
    marginBottom: theme.spacing[1],
    flexGrow: 0,
    color: DISTANCE_TEXT_COLOR,
  },
}));

export const Container = withUnistyles(TransparentAndroidDarkBlurView);

export const DistanceText = Text;
