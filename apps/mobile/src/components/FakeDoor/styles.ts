import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  /**
   * Deliberately the same metrics as `DogShareOptions`' own option row, so a
   * fake door reads as one more thing the sheet can do rather than an
   * advertisement bolted to the bottom of it.
   */
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
        default: { opacity: 1 },
      },
    },
  },
  rowIcon: {
    alignItems: "center",
    width: 22,
  },
  rowLabel: {
    flexShrink: 1,
    flexGrow: 1,
  },
  /**
   * Small, low contrast and after the label: it has to say "not yet" clearly
   * enough that a tap is a vote and not a bug report, without competing with
   * the rows that do work.
   */
  pill: {
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    backgroundColor: theme.colors.secondary,
    paddingTop: theme.spacing[0.5],
    paddingRight: theme.spacing[2],
    paddingBottom: theme.spacing[0.5],
    paddingLeft: theme.spacing[2],
  },
  pillLabel: {
    color: theme.colors.primary,
  },

  // Sheet chrome, matching `DogShareOptions` so both sheets read as the same
  // kind of surface.
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
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[4],
  },
  feature: {
    textAlign: "center",
    color: theme.colors.subtitle,
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    paddingLeft: theme.spacing[4],
  },
  titleDivider: {
    marginLeft: 0,
    marginRight: 0,
  },
  body: {
    color: theme.colors.subtitle,
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[4],
  },
  notifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingTop: theme.spacing[3],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
  },
  notifyLabel: {
    flexShrink: 1,
    flexGrow: 1,
  },
  closeButton: {
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
}));
