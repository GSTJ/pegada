import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  container: {
    alignItems: "center",
    maxWidth: 300,
    justifyContent: "center",
  },
  title: {
    color: theme.colors.text,
  },
  whiteTitle: {
    color: theme.colors.white,
  },
  textHighlight: {
    color: theme.colors.primary,
  },
  underlineContainer: {
    alignSelf: "flex-start",
  },
  /**
   * The rule has to be given room, not squeezed into the descender gap.
   *
   * A single line of Gilroy is `ascender + |descender|` tall — at 18pt that
   * leaves ~3.5pt under the baseline, which a 4pt bar at `bottom: 2` cannot
   * fit into: it came to rest straddling the baseline and struck the label
   * through instead of underlining it ("Resend the code" on the OTP screen).
   * `paddingBottom` extends the box below the text box by a known amount and
   * the rule sits at its foot, so the geometry no longer depends on the
   * font's metrics or on the size the caller happens to render at.
   */
  underlineText: {
    paddingBottom: theme.spacing[1.5],
  },
  line: {
    position: "absolute",
    right: 0,
    left: 0,
    bottom: 0,
    height: 4,
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
  },
  rotatedRectangle: {
    position: "absolute",
    right: 0,
    left: 0,
    width: "110%",
    marginLeft: "-5%",
    marginTop: "-3%",
    top: theme.spacing[2],
    height: 37,
    transform: [{ rotate: "-3deg" }],
    backgroundColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
  },
  flexRowView: {
    flexDirection: "row",
  },
}));

export const Title = Text;

export const WhiteTitle = Text;

export const TextHighlight = Text;
