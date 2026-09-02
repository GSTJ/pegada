import LottieView from "lottie-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import * as LikeFeedbackStyles from "@/components/FeedbackCard/components/LikeFeedback/styles";
import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";

/**
 * The whole empty state reads as one column: the illustration, the copy and
 * the action all share a width, so the button never runs wider than the line
 * of text above it.
 */
const COLUMN_MAX_WIDTH = 274;

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: "transparent",
  },
  /**
   * The column fits on one screen now, but a large accessibility text size
   * can still push the preferences link past the fold, and that link is the
   * only other way off this screen.
   */
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
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
  column: {
    width: "100%",
    maxWidth: COLUMN_MAX_WIDTH,
  },
  /**
   * The empty state's own illustration style. Sharing `logoLoading` gave it
   * `marginTop: "auto"` and `marginBottom: "auto"`, which let it absorb the
   * column's free space and pushed its top edge up under the location pill,
   * where it was clipped.
   */
  illustration: {
    width: 150,
    height: 150,
    alignSelf: "center",
    marginBottom: theme.spacing[2],
  },
  title: {
    marginBottom: theme.spacing[2],
    paddingBottom: 2,
    textAlign: "center",
  },
  description: {
    paddingBottom: 4,
    textAlign: "center",
    marginBottom: theme.spacing[6],
  },
  preferencesLink: {
    alignItems: "center",
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  /**
   * Subtitle rather than the primary pink: the pink is 2.8:1 on the light
   * background, under the 4.5:1 this size needs, and it is also the colour of
   * the button right above it. One pink thing on the screen is the point.
   */
  preferencesLinkLabel: {
    color: theme.colors.subtitle,
    textDecorationLine: "underline",
  },
}));

export const Container = withUnistyles(LikeFeedbackStyles.Container);

export const EmptyAnimation = withUnistyles(LottieView);

export const LogoLoading = withUnistyles(LottieView);

export const Title = Text;

export const Description = Text;

export const LinkPressable = PressableArea;

export const LinkLabel = Text;
