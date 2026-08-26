import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";

export const styles = StyleSheet.create({
  styledButton: {
    width: "100%",
  },
});

export const StyledButton = withUnistyles(Button);
