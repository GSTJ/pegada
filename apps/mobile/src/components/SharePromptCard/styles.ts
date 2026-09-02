import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  /**
   * A card rather than loose text: on the empty deck it has to hold its own
   * against a full-screen empty state, and in the first-match sheet it is the
   * only content. `card` is the same surface the rest of the app uses for
   * "this is a thing you can act on".
   */
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    gap: theme.spacing[2],
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: theme.colors.subtitle,
    marginBottom: theme.spacing[2],
  },

  // First-match placement: the same card, wrapped in the app's bottom sheet
  // chrome so it arrives the way every other sheet does.
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
    paddingBottom: theme.spacing[3],
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
  sheetCard: {
    marginLeft: theme.spacing[3],
    marginRight: theme.spacing[3],
  },
  dismissButton: {
    alignItems: "center",
    marginTop: theme.spacing[2],
    marginLeft: theme.spacing[3],
    marginRight: theme.spacing[3],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[3],
  },
  dismissLabel: {
    color: theme.colors.subtitle,
  },
}));
