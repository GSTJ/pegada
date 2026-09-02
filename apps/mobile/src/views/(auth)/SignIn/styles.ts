import { ImageBackground } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import { Text } from "@/components/text";

/** Exported so the view can price the logo before it decides to render it. */
export const LOGO_MARGIN_BOTTOM = 25;

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  pressableContainer: {
    flexGrow: 1,
  },
  keyboardAvoidingViewStyled: {
    flexGrow: 1,
  },
  logoStyled: {
    marginBottom: LOGO_MARGIN_BOTTOM,
  },
  /**
   * The hero owns whatever height the card below it leaves, and that height
   * drops by the whole banner when a `/dog/<id>` link brings someone here
   * signed out. It used to keep painting at full size into a box that no
   * longer fit it, and the card, drawn after it, cut the headline through the
   * letterforms. Clipped here instead, and the two spacers and the logo give
   * their height up before the headline has to.
   */
  topCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    paddingRight: theme.spacing[4],
    paddingLeft: theme.spacing[4],
  },
  /** The box the hero has to fit into, measured rather than assumed: it is the
   * card minus the notch inset, and the banner is what takes it away. */
  heroSpace: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  /** Was the caller's `paddingTop: 60 + insets.top`, which cannot shrink. The
   * inset half stays a padding: it is the notch and it never gives. */
  topSpacer: {
    height: 60,
    flexShrink: 1,
  },
  /** Was `paddingBottom`. */
  bottomSpacer: {
    height: theme.spacing[10],
    flexShrink: 1,
  },
  bottomCard: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    borderTopColor: theme.colors.border,
    borderTopWidth: theme.stroke.md,
  },
  title: {
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  highlight: {
    color: theme.colors.primary,
    marginBottom: theme.spacing[1],
  },
  description: {
    color: theme.colors.text,
  },
}));

export const Container = withUnistyles(SafeAreaView);

export const LogoStyled = withUnistyles(Logo);

export const TopCard = withUnistyles(ImageBackground, (theme) => ({
  imageStyle: {
    opacity: 0.2,
    backgroundColor: theme.colors.background,
    transform: [{ scale: 1.05 }],
  },
}));

export const Title = Text;

export const Highlight = Text;

export const Description = Text;
