import LottieView from "lottie-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  swipe: {
    width: theme.spacing[6],
    height: theme.spacing[6],
    right: -theme.spacing[1],
  },
  container: {
    position: "absolute",
    paddingTop: theme.spacing[2.5],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[2.5],
    paddingLeft: theme.spacing[4],
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "solid",
    alignItems: "center",
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    top: -70,
  },
  row: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  content: {
    alignItems: "center",
  },
  rect: {
    position: "absolute",
    bottom: -theme.spacing[1.5],
    width: theme.spacing[2.5],
    height: theme.spacing[2.5],
    backgroundColor: theme.colors.background,
    borderLeftWidth: theme.stroke.md,
    borderBottomWidth: theme.stroke.md,
    borderLeftColor: theme.colors.border,
    borderBottomColor: theme.colors.border,
    transform: [{ rotate: "-45deg" }],
  },
  title: {},
  description: {},
}));

export const Swipe = withUnistyles(LottieView);

export const Title = Text;

export const Description = Text;
