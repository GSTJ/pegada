import { StyleSheet } from "react-native-unistyles";

/**
 * `Text` centres the ascent-to-descent box, and Gilroy's descent runs
 * deeper than the gap above its caps, so an unstyled label always renders
 * about 10.4% of its own font size low: with hhea ascender 1100, descender
 * -192 and cap height 700 (all /1000 upem), the cap band's own centre sits
 * at 0.75em from the top of the run, against 0.646em for the ascent
 * descent box's centre — a 0.104em gap. Nudging the label up by that much
 * of its `fontSize` re-centres it on the icon or pill next to it instead of
 * on its own invisible descender. Same fix at every call site since `Text`
 * itself is shared well beyond this sheet.
 */
const GILROY_CAP_OFFSET_RATIO = 0.104;
const capOffset = (fontSize: number) => -(fontSize * GILROY_CAP_OFFSET_RATIO);

// Two lines of a `sm` label plus the row's own vertical padding — the
// height every row already grows to the moment its label needs a second
// line (measured on the referral row, see #244). Every row reserves this
// height up front so a long label never makes its own row the odd one out;
// the alternative was shortening the copy, which isn't this file's call.
const TWO_LINE_ROW_MIN_HEIGHT = 71.33;

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.surfaceElevated,
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
    backgroundColor: theme.elevated.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3.5],
    minHeight: TWO_LINE_ROW_MIN_HEIGHT,
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
  // Full bleed, same as `titleDivider`: the list had two separator
  // treatments (this one inset to the icon's left edge, the title's rule
  // edge to edge), which read as neither a full rule nor a text-aligned
  // one. One rule style for the whole sheet.
  rowDivider: {
    marginLeft: 0,
    marginRight: 0,
    backgroundColor: theme.elevated.border,
  },
  rowIcon: {
    width: 22,
    alignItems: "center",
  },
  rowLabel: {
    flexGrow: 1,
    transform: [{ translateY: capOffset(theme.typography.sizes.sm.size) }],
  },
  // Same surface as the sheet above it, so the two read as one layer
  // floating over the dimmed screen rather than as two holes cut in it.
  // Radius matches the sheet's own `radii.md` too — the two stack 8pt
  // apart and were reading as two different kinds of surface when this
  // one used `radii.round` instead.
  cancelButton: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginTop: theme.spacing[2],
    marginLeft: theme.spacing[3],
    marginRight: theme.spacing[3],
    marginBottom: theme.spacing[2],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    alignItems: "center",
  },
  cancelLabel: {
    transform: [{ translateY: capOffset(theme.typography.sizes.lg.size) }],
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
