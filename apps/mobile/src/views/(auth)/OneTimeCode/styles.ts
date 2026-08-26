import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";

const LOADING_CONTAINER_BACKGROUND_COLOR = "rgba(0, 0, 0, 0.5)";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  resendCode: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondary,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    paddingTop: theme.spacing[2.5],
    paddingRight: theme.spacing[2.5],
    paddingBottom: theme.spacing[2.5],
    paddingLeft: theme.spacing[2.5],
    alignSelf: "center",
    variants: {
      disabled: {
        true: {
          opacity: 0.5,
        },
        false: {
          opacity: 1,
        },
        default: {
          opacity: 1,
        },
      },
    },
  },
  topColumn: {
    justifyContent: "center",
    alignItems: "center",
  },
  timer: {
    color: theme.colors.text,
  },
  description: {
    color: theme.colors.text,
    textAlign: "center",
    marginTop: theme.spacing[2.5],
    maxWidth: 300,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: LOADING_CONTAINER_BACKGROUND_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  styledKeyboardAvoidingView: {
    flexGrow: 1,
  },
}));

export const ResendCode = withUnistyles(PressableArea);

export const Timer = Text;

export const Description = Text;
