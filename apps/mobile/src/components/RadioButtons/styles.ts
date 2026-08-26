import type { PressableProps } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";

export type OptionButtonProps = {
  marked?: boolean;
  last?: boolean;
} & PressableProps;

export const styles = StyleSheet.create((theme) => ({
  content: {
    justifyContent: "space-between",
    flexGrow: 1,
    alignItems: "center",
    flexDirection: "row",
    paddingTop: theme.spacing[3],
  },
  radioButtonContainer: {
    paddingTop: theme.spacing[3],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    paddingLeft: theme.spacing[4],
    backgroundColor: theme.colors.background,
    borderWidth: theme.stroke.xxl,
    borderColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    alignItems: "center",
    variants: {
      last: {
        true: {},
        default: {
          marginRight: theme.spacing[3],
        },
      },
      marked: {
        true: {
          backgroundColor: theme.colors.primary,
        },
      },
    },
  },
  textButton: {
    color: theme.colors.primary,
    variants: {
      marked: {
        true: {
          color: theme.colors.background,
        },
      },
    },
  },
}));

export const RadioButtonContainer = withUnistyles(PressableArea);

export const TextButton = withUnistyles(Text);
