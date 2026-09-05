import { StyleSheet } from "react-native-unistyles";

// Same derivation as `FakeDoor/styles.ts`: `Text` sits on Gilroy's
// ascent-descent box rather than its cap height, and neither file can fix
// that once inside the shared primitive.
const GILROY_CAP_OFFSET_RATIO = 0.104;
const capOffset = (fontSize: number) => -(fontSize * GILROY_CAP_OFFSET_RATIO);

const RADIO_SIZE = 20;
const RADIO_DOT_SIZE = 10;

export const styles = StyleSheet.create((theme) => ({
  // Sheet chrome, copied from `FakeDoor` so every sheet in the app reads as
  // the same kind of surface.
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
  title: {
    paddingTop: theme.spacing[1],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[4],
  },
  subtitle: {
    color: theme.colors.subtitle,
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
  },
  titleDivider: {
    marginLeft: 0,
    marginRight: 0,
    backgroundColor: theme.elevated.border,
  },

  /**
   * One reason per line rather than the side by side layout `RadioButtons`
   * uses: that component is built for two short options, and five reasons laid
   * out in a row wrap into an unreadable grid.
   */
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingTop: theme.spacing[3.5],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[3.5],
    paddingLeft: theme.spacing[4],
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: theme.radii.round,
    borderWidth: theme.stroke.md,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  // Plain style keys rather than Unistyles variants for the three states
  // below: the rows and the submit button are separate components reading one
  // stylesheet, and nested `useVariants` calls on the same sheet resolve
  // against whichever ran last.
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: RADIO_DOT_SIZE,
    height: RADIO_DOT_SIZE,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primary,
  },
  reasonLabel: {
    flexShrink: 1,
    flexGrow: 1,
    flexBasis: 0,
    color: theme.colors.subtitle,
    transform: [{ translateY: capOffset(theme.typography.sizes.sm.size) }],
  },
  reasonLabelSelected: {
    color: theme.colors.text,
  },

  detailsLabel: {
    color: theme.colors.subtitle,
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[2],
    paddingLeft: theme.spacing[4],
  },
  detailsInput: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.sizes.sm.size,
    // A fixed height rather than `multiline` growth: the sheet is anchored to
    // the bottom of the screen, so a box that grows pushes its own submit
    // button under the keyboard.
    height: 88,
    marginLeft: theme.spacing[4],
    marginRight: theme.spacing[4],
    paddingTop: theme.spacing[3],
    paddingRight: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    paddingLeft: theme.spacing[3],
    textAlignVertical: "top",
  },

  submitButton: {
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginTop: theme.spacing[4],
    marginRight: theme.spacing[4],
    marginBottom: theme.spacing[4],
    marginLeft: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    alignItems: "center",
    justifyContent: "center",
    // Holds the row's height steady when the label is swapped for a spinner.
    minHeight: 56,
  },
  // Disabled until a reason is picked: the five choices are the whole point of
  // the sheet, and a report with no reason cannot be counted.
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    color: theme.colors.background,
    transform: [{ translateY: capOffset(theme.typography.sizes.lg.size) }],
  },

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
}));
