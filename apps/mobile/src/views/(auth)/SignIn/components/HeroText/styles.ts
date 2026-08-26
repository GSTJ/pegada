import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    maxWidth: 300,
    justifyContent: "center",
  },
  title: {
    color: theme.colors.text,
  },
  whiteTitle: {
    color: theme.colors.white,
  },
  textHighlight: {
    color: theme.colors.primary,
  },
  underlineContainer: {
    alignSelf: "flex-start",
  },
  line: {
    position: "absolute",
    right: 0,
    left: 0,
    bottom: theme.spacing[0.5],
    height: 4,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
  },
  rotatedRectangle: {
    position: "absolute",
    right: 0,
    left: 0,
    width: "110%",
    marginLeft: "-5%",
    marginTop: "-3%",
    top: theme.spacing[2],
    height: 37,
    transform: [{ rotate: "-3deg" }],
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
  },
  flexRowView: {
    flexDirection: "row",
  },
}));

export const Title = withUnistyles(Text);

export const WhiteTitle = withUnistyles(Text);

export const TextHighlight = withUnistyles(Text);
