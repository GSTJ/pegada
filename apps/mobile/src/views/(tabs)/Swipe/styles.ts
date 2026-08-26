import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: theme.colors.background,
  },
  locationButton: {
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[2],
    paddingBottom: theme.spacing[2],
    paddingLeft: theme.spacing[2],
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: theme.spacing[2],
  },
}));

export const Container = withUnistyles(SafeAreaView);

export const LocationButton = withUnistyles(PressableArea);
