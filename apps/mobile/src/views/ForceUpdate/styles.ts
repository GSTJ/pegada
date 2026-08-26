import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  centerText: {
    textAlign: "center",
  },
}));

export const Container = withUnistyles(SafeAreaView);

export const CenterText = Text;
