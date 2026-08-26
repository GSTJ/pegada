import Color from "color";
import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  benefitContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3.5],
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    paddingTop: theme.spacing[3.5],
    paddingRight: theme.spacing[3.5],
    paddingBottom: theme.spacing[3.5],
    paddingLeft: theme.spacing[3.5],
    backgroundColor: new Color(theme.colors.text)
      .alpha(theme.dark ? 0.05 : 0.02)
      .toString(),
  },
  /**
   * The tint comes in from the call site as a hex string, one per benefit, so
   * it has no bucket to be a variant of. A dynamic style function is what
   * Unistyles offers for a value it cannot enumerate.
   */
  benefitIconContainer: (color: string) => ({
    height: theme.spacing[10],
    width: theme.spacing[10],
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
    backgroundColor: new Color(color).alpha(theme.dark ? 0.2 : 0.1).toString(),
  }),
  contentContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  container: {
    gap: theme.spacing[2.5],
  },
}));
