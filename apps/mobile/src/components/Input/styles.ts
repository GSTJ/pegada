import { TextInput as RNTextInput } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import cancelIcon from "@/assets/images/Cancel.svg";
import { PressableArea } from "@/components/pressable-area";

export const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: theme.spacing[4],
  },
  content: {
    flexDirection: "row",
    backgroundColor: theme.colors.input,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    paddingTop: theme.spacing[3.5],
    paddingRight: theme.spacing[3.5],
    paddingBottom: theme.spacing[3.5],
    paddingLeft: theme.spacing[3.5],
    borderWidth: theme.stroke.md,
    borderColor: theme.colors.border,
    borderStyle: "solid",
    alignItems: "center",
  },
  titleContainer: {
    marginBottom: theme.spacing[3],
  },
  cancelTouchArea: {
    paddingLeft: theme.spacing[2.5],
  },
  cancelIcon: {
    opacity: 0.5,
    width: theme.spacing[4],
    height: theme.spacing[4],
  },
  textInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: "medium",
    fontSize: theme.typography.sizes.xs.size,
  },
  activityIndicatorComponent: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
}));

export const CancelTouchArea = withUnistyles(PressableArea);

export const CancelIcon = withUnistyles(cancelIcon, (theme) => ({
  fill: theme.colors.placeholder,
}));

export const TextInput = withUnistyles(RNTextInput, (theme) => ({
  placeholderTextColor: theme.colors.placeholder,
  selectionColor: theme.colors.primary,
}));
