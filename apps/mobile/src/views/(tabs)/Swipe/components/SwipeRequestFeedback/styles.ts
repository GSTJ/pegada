import LottieView from "lottie-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import * as LikeFeedbackStyles from "@/components/FeedbackCard/components/LikeFeedback/styles";
import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: "transparent",
  },
  emptyAnimation: {
    width: 100,
    height: 100,
  },
  logoLoading: {
    width: 150,
    height: 150,
    marginTop: "auto",
    marginRight: "auto",
    marginBottom: "auto",
    marginLeft: "auto",
  },
  title: {
    marginBottom: theme.spacing[1],
    paddingBottom: 2,
    textAlign: "center",
  },
  description: {
    paddingBottom: 4,
    textAlign: "center",
    marginBottom: theme.spacing[4],
    maxWidth: 274,
  },
}));

export const Container = withUnistyles(LikeFeedbackStyles.Container);

export const EmptyAnimation = withUnistyles(LottieView);

export const LogoLoading = withUnistyles(LottieView);

export const Title = Text;

export const Description = Text;
