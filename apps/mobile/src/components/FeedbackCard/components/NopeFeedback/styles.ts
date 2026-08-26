import { StyleSheet, withUnistyles } from "react-native-unistyles";

import * as LikeFeedbackStyles from "../LikeFeedback/styles";

const CONTAINER_BACKGROUND_COLOR = "#ffcecb";

export const styles = StyleSheet.create({
  container: {
    backgroundColor: CONTAINER_BACKGROUND_COLOR,
  },
});

export const Container = withUnistyles(LikeFeedbackStyles.Container);
