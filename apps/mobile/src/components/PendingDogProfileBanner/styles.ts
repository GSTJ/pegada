import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2.5],
    backgroundColor: theme.colors.secondary,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    paddingTop: theme.spacing[3],
    paddingRight: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    paddingLeft: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  textColumn: {
    flexShrink: 1,
    gap: theme.spacing[0.5],
  },
  title: {
    color: theme.colors.text,
  },
  body: {
    color: theme.colors.text,
  },
}));
