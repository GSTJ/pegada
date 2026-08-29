import { StyleSheet } from "react-native-unistyles";

export const WIDTH = 36;
const HEIGHT = 24;
const TRIANGLE_SIZE = 4;
export const MARKER_SIZE = 20;
export const TRACK_STROKE = 3;

export const styles = StyleSheet.create((theme) => ({
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing[6],
  },
  labelContainer: {
    position: "absolute",
    // Anchored from the bottom of the slider's own container (which is
    // exactly MARKER_SIZE tall — see sliderContainer below) rather than from
    // the top, so the label sits just above the track regardless of
    // whatever content happens to sit above this slider in the screen.
    bottom: MARKER_SIZE + 20,
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
