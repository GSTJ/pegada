import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";

const GO_BACK_SHADOW_COLOR = "#000";

export const styles = StyleSheet.create((theme) => ({
  container: {
    zIndex: 20,
    position: "absolute",
    right: 0,
  },
  /**
   * Sits inside the card rather than against the screen edge. It used to be a
   * 68 wide box pinned to `right: 0` with only its left corners rounded and
   * the arrow pushed to one side by a left padding, which reads as a pill that
   * ran off the screen. Rounded on all four corners, inset past the card's own
   * margin and with the arrow centred, it reads as the floating control it is.
   */
  goBack: {
    width: 56,
    height: 50,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    marginTop: theme.spacing[24],
    marginRight: theme.spacing[4],
    shadowColor: GO_BACK_SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.025,
    shadowRadius: 2,
    elevation: 25,
  },
}));

export const GoBack = withUnistyles(PressableArea);
