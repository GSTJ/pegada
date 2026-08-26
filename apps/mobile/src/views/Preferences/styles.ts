import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  inputRow: {
    flexDirection: "row",
  },
  inputSpace: {
    width: theme.spacing[4],
  },
  sliderContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  divisor: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: theme.spacing[5],
    marginRight: theme.spacing[5],
    marginBottom: theme.spacing[5],
    marginLeft: theme.spacing[5],
  },
  buttonContainer: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    borderTopColor: theme.colors.border,
    borderTopWidth: theme.stroke.md,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  distanceContainer: {
    marginBottom: theme.spacing[6],
  },
}));
