import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderBottomRightRadius: theme.radii.lg,
    borderBottomLeftRadius: theme.radii.lg,
    marginLeft: theme.spacing[3],
    marginRight: theme.spacing[3],
    overflow: "hidden",
  },
  title: {
    textAlign: "center",
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    paddingLeft: theme.spacing[4],
  },
  titleDivider: {
    marginLeft: 0,
    marginRight: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3.5],
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    variants: {
      disabled: {
        true: { opacity: 0.5 },
        false: { opacity: 1 },
        default: { opacity: 1 },
      },
    },
  },
  rowDivider: {
    marginLeft: theme.spacing[4],
    marginRight: 0,
  },
  rowIcon: {
    width: 22,
    alignItems: "center",
  },
  rowLabel: {
    flexGrow: 1,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderBottomRightRadius: theme.radii.lg,
    borderBottomLeftRadius: theme.radii.lg,
    marginTop: theme.spacing[2],
    marginLeft: theme.spacing[3],
    marginRight: theme.spacing[3],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    alignItems: "center",
  },
  /**
   * Sized and shaped like the real card, moved just past the right edge of
   * the modal's own full-window container rather than thousands of dp away —
   * a view positioned fully outside the window can end up not rendered at
   * all on iOS, whereas this stays within the same overlay's coordinate
   * space and simply falls outside its visible bounds.
   */
  offscreenHost: {
    position: "absolute",
    top: 0,
  },
}));
