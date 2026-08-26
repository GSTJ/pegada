import { StyleSheet, withUnistyles } from "react-native-unistyles";

import ShadowIcon from "@/assets/images/Shadow.svg";

export const styles = StyleSheet.create({
  container: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
  },
  content: {
    top: -20,
    alignItems: "center",
  },
  shadow: {
    bottom: -38,
    left: 0,
    right: 0,
    alignSelf: "center",
  },
  markerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export const Shadow = withUnistyles(ShadowIcon);
