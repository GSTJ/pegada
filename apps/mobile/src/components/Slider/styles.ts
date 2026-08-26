import { StyleSheet } from "react-native-unistyles";

export const WIDTH = 36;
const HEIGHT = 24;
const TRIANGLE_SIZE = 4;

export const styles = StyleSheet.create((theme) => ({
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing[6],
  },
  labelContainer: {
    position: "absolute",
    top: HEIGHT + 20,
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
    height: 20,
    width: 20,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    backgroundColor: theme.colors.background,
    borderWidth: 2.3,
    borderColor: theme.colors.primary,
    transform: [{ translateY: 1 }],
  },
}));
