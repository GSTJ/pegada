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
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginLeft: theme.spacing[3],
    marginRight: theme.spacing[3],
    overflow: "hidden",
  },
  // Matches `Picker`'s own drag handle so every bottom sheet in the app
  // reads as the same kind of surface.
  handleContainer: {
    alignItems: "center",
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[2],
  },
  handleBar: {
    width: theme.spacing[9],
    height: 4,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.text,
    opacity: 0.3,
  },
  title: {
    textAlign: "center",
    paddingTop: theme.spacing[1],
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
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    marginTop: theme.spacing[2],
    marginLeft: theme.spacing[3],
    marginRight: theme.spacing[3],
    marginBottom: theme.spacing[2],
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
