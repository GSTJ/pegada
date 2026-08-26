import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";

const GO_BACK_SHADOW_COLOR = "#000";

export const styles = StyleSheet.create((theme) => ({
  container: {
    zIndex: 20,
    position: "absolute",
    right: 0,
  },
  goBack: {
    width: 68,
    height: 50,
    borderTopLeftRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    marginLeft: "auto",
    marginTop: theme.spacing[24],
    paddingLeft: theme.spacing[4],
    shadowColor: GO_BACK_SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.025,
    shadowRadius: 2,
    elevation: 25,
  },
}));

export const GoBack = withUnistyles(PressableArea);
