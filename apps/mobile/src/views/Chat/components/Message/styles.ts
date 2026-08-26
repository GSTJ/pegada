import Color from "color";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";

import { FeedbackStatus } from "../feedback";

export const Time = withUnistyles(Text);

const MESSAGE_SHADOW_COLOR = "#000";
const MESSAGE_BORDER_COLOR = "#dd2e44";

export const styles = StyleSheet.create((theme) => ({
  /**
   * The two prop conditionals become two variant groups. Both of them override
   * a corner radius and a colour the base already set, and in that direction
   * Unistyles agrees with styled-components: the base first, the buckets on
   * top.
   */
  message: {
    paddingTop: theme.spacing[1.5],
    paddingRight: theme.spacing[2.5],
    paddingBottom: theme.spacing[2.5],
    paddingLeft: theme.spacing[2.5],
    alignItems: "flex-end",
    maxWidth: "60%",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    elevation: 0.5,
    shadowColor: MESSAGE_SHADOW_COLOR,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: theme.spacing[1],
    gap: theme.spacing[1.5],
    variants: {
      sending: {
        true: {
          marginLeft: "auto",
          borderBottomRightRadius: 0,
        },
        default: {
          marginRight: "auto",
          borderBottomLeftRadius: 0,
        },
      },
      status: {
        [FeedbackStatus.Error]: {
          borderColor: MESSAGE_BORDER_COLOR,
        },
        // Declared but empty: the guard only ever matched `Error`, and spelling
        // the other two out is what lets the call site hand the prop straight
        // to `useVariants` instead of narrowing it first.
        [FeedbackStatus.Loading]: {},
        [FeedbackStatus.Success]: {},
        default: {},
      },
    },
  },
  info: {
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: "auto",
    paddingLeft: theme.spacing[1],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  time: {
    color: new Color(theme.colors.text).alpha(0.5).string(),
  },
}));
