import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";

export const styles = StyleSheet.create({
  styledButton: {
    width: "100%",
  },
  submitOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});

export const StyledButton = withUnistyles(Button);
