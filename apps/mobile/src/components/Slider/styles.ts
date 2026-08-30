import { StyleSheet } from "react-native-unistyles";

export const WIDTH = 32;
const HEIGHT = 24;
const TRIANGLE_SIZE = 4;
export const MARKER_SIZE = 20;
export const TRACK_STROKE = 3;
// Gap between the marker and the value bubble sitting below it.
const LABEL_GAP = 12;
// Space the wrapper must reserve below the track so the bubble (plus its
// shadow) never clips and never overlaps whatever comes after the slider.
export const LABEL_SPACE = LABEL_GAP + HEIGHT;

export const styles = StyleSheet.create((theme) => ({
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing[6],
  },
  sliderWrapper: {
    // Reserves room below the track for the value bubble, which is
    // absolutely positioned and would otherwise clip or overlap whatever
    // follows the slider (the next slider, or the Save button).
    paddingBottom: LABEL_SPACE,
  },
  labelContainer: {
    position: "absolute",
    // Anchored from the top of the slider's own container, just below the
    // marker, so the bubble never overlaps the title/range labels that sit
    // above the track.
    top: MARKER_SIZE + LABEL_GAP,
    width: WIDTH,
    height: HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
    elevation: 5,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  triangle: {
    // Sits on the bubble's top edge, pointing up at the marker above it.
    position: "absolute",
    top: -(TRIANGLE_SIZE / 2),
    left: WIDTH / 2 - TRIANGLE_SIZE / 2,
    width: TRIANGLE_SIZE,
    height: TRIANGLE_SIZE,
    backgroundColor: theme.colors.primary,
    transform: [{ rotate: "45deg" }],
  },
  marker: {
    height: MARKER_SIZE,
    width: MARKER_SIZE,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    backgroundColor: theme.colors.background,
    borderWidth: 2.3,
    borderColor: theme.colors.primary,
  },
  markerPositioner: {
    position: "absolute",
    top: 0,
  },
  sliderContainer: {
    height: MARKER_SIZE,
    justifyContent: "center",
  },
  trackLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: (MARKER_SIZE - TRACK_STROKE) / 2,
    height: TRACK_STROKE,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.border,
  },
  sliderSelected: {
    position: "absolute",
    top: (MARKER_SIZE - TRACK_STROKE) / 2,
    height: TRACK_STROKE,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primary,
  },
}));
