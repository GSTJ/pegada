import { StyleSheet } from "react-native-unistyles";

// See the identical constant in `DogShareOptions/styles.ts` for the
// derivation — both files nudge `Text` up onto Gilroy's cap height instead
// of its ascent-descent box, and neither can reach into the shared `Text`
// primitive to fix it once for every caller.
const GILROY_CAP_OFFSET_RATIO = 0.104;
const capOffset = (fontSize: number) => -(fontSize * GILROY_CAP_OFFSET_RATIO);

// Matches `DogShareOptions/styles.ts`'s own `TWO_LINE_ROW_MIN_HEIGHT`: the
// height the referral row already grows to the moment its label wraps (see
// #244), reserved on every row so none of the five is the odd one out.
const TWO_LINE_ROW_MIN_HEIGHT = 71.33;

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
    minHeight: TWO_LINE_ROW_MIN_HEIGHT,
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
    flexBasis: 0,
    transform: [{ translateY: capOffset(theme.typography.sizes.sm.size) }],
  },
  /**
   * Small, quiet and after the label: it has to say "not yet" clearly enough
   * that a tap is a vote and not a bug report, without competing with the
   * rows that do work.
   *
   * Neutral rather than pink. Brand pink on pale pink was the only colour on
   * the whole sheet, which pulled the eye straight to the two rows that do
   * nothing, and it read at 2.6:1 — a label announcing itself loudly and
   * then being the hardest thing there to actually read. Grey on grey lands
   * at about 6:1 in light and 5.3:1 in dark and stays in the background
   * where it belongs.
   */
  pill: {
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    // `card` steps toward `background` as the theme darkens, which is the
    // wrong direction for a chip floating on `surfaceElevated` — it read at
    // 1.05:1 in light and 1.13:1 in dark, no visible fill at all.
    // `elevated.chip` is 1.34:1 light, 1.31:1 dark.
    backgroundColor: theme.elevated.chip,
    paddingTop: theme.spacing[0.5],
    paddingRight: theme.spacing[2],
    paddingBottom: theme.spacing[0.5],
    paddingLeft: theme.spacing[2],
  },
  // Uppercase with a touch of tracking: at 11pt the caps read as a status
  // stamp rather than as another sentence competing with the row's label,
  // and small type needs the extra letter spacing to stay legible.
  pillLabel: {
    color: theme.colors.subtitle,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    transform: [{ translateY: capOffset(theme.typography.sizes.xxs.size) }],
  },

  // Sheet chrome, matching `DogShareOptions` so both sheets read as the same
  // kind of surface.
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
  // Left aligned, matching `body` and `notifyRow` below the rule: the
  // title and feature name used to centre while everything under them read
  // left to right, which split the sheet into two different layouts.
  title: {
    paddingTop: theme.spacing[1],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[4],
  },
  feature: {
    color: theme.colors.subtitle,
    paddingRight: theme.spacing[4],
    // Matches `body`'s own paddingTop below the rule, so the rule sits
    // dead centre in the gap instead of 12pt above it and 16pt below.
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
  },
  titleDivider: {
    marginLeft: 0,
    marginRight: 0,
    backgroundColor: theme.elevated.border,
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
  // Radius matches the sheet's own `radii.md`, same reasoning as
  // `DogShareOptions`' cancel button: the two surfaces stack 8pt apart and
  // need to agree.
  closeButton: {
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
  closeLabel: {
    transform: [{ translateY: capOffset(theme.typography.sizes.lg.size) }],
  },
}));
