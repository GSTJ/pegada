import Color from "color";
import { StyleSheet } from "react-native-unistyles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    height: theme.spacing[6],
    width: theme.spacing[6],
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    backgroundColor: theme.colors.card,
    borderWidth: theme.stroke.lg,
    borderColor: theme.colors.border,
    variants: {
      selected: {
        true: {
          backgroundColor: new Color(theme.colors.primary)
            .alpha(0.2)
            .toString(),
          borderColor: theme.colors.primary,
        },
      },
    },
  },
}));
