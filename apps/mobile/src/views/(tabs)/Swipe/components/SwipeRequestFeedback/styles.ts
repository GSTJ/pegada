import LottieView from "lottie-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import Check from "@/assets/images/Check.svg";
import * as LikeFeedbackStyles from "@/components/FeedbackCard/components/LikeFeedback/styles";
import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: "transparent",
  },
  /**
   * The empty state is taller than one screen once the share card is in it,
   * and the preferences button is the last thing in the column — the copy asks
   * people to adjust their preferences, so that button has to be reachable on
   * the shortest phone we support.
   */
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: "transparent",
  },
  notifyDone: {
    flexDirection: "row",
    gap: theme.spacing[2],
    alignItems: "center",
    justifyContent: "center",
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[4],
  },
  /**
   * The label takes the body text colour and only the check is pink. The
   * primary pink is a 3:1 foreground on the light background, which is under
   * the 4.5:1 this size needs, and it is also the colour of everything on this
   * screen that can still be tapped.
   */
  notifyDoneText: {
    color: theme.colors.text,
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
  actions: {
    gap: theme.spacing[3],
  },
}));

export const Container = withUnistyles(LikeFeedbackStyles.Container);

export const EmptyAnimation = withUnistyles(LottieView);

export const LogoLoading = withUnistyles(LottieView);

export const Title = Text;

export const Description = Text;

/** The check on the notify opt-in once it has been taken. */
export const DoneCheck = withUnistyles(Check, (theme) => ({
  color: theme.colors.primary,
}));

export const DoneLabel = Text;
