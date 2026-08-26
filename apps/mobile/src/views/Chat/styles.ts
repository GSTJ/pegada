import Animated, { FadeInUp } from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  background: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: theme.colors.background,
  },
  centeredView: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: theme.spacing[6],
    paddingRight: theme.spacing[3],
    paddingBottom: theme.spacing[6],
    paddingLeft: theme.spacing[3],
  },
  centeredText: {
    textAlign: "center",
  },
}));

export const CenteredView = withUnistyles(Animated.View, () => ({
  entering: FadeInUp,
}));

export const CenteredText = Text;
