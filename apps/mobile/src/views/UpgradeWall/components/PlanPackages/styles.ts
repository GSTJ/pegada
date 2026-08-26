import Color from "color";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  flex: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  container: {
    gap: theme.spacing[2.5],
  },
  planContainer: {
    borderWidth: theme.stroke.lg,
    borderColor: theme.colors.border,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    gap: theme.spacing[3.5],
    flexDirection: "row",
    alignItems: "center",
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    variants: {
      selected: {
        true: {
          backgroundColor: new Color(theme.colors.primary)
            .alpha(0.1)
            .toString(),
          borderColor: theme.colors.primary,
        },
      },
    },
  },
  percentContainer: {
    position: "absolute",
    top: -theme.spacing[3],
    right: theme.spacing[3],
    backgroundColor: theme.colors.primary,
    paddingTop: theme.spacing[1],
    paddingRight: theme.spacing[2],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[2],
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
  },
  percentText: {
    lineHeight: theme.typography.sizes.sm.size,
    color: "white",
  },
  price: {},
  oldPrice: {
    textDecorationLine: "line-through",
  },
}));

export const PlanContainer = withUnistyles(PressableArea);

export const PercentText = Text;

export const Price = Text;

export const OldPrice = Text;
