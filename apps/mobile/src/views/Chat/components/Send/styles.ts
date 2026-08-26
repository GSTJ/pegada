import { TextInput } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { BlurView } from "@/components/blur-view";

export const styles = StyleSheet.create((theme) => ({
  input: {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[2],
    paddingLeft: theme.spacing[4],
    backgroundColor: theme.colors.card,
    borderWidth: theme.stroke.sm,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.sizes.md.size,
  },
  container: {
    paddingTop: 0,
    paddingRight: theme.spacing[2],
    paddingBottom: 0,
    paddingLeft: theme.spacing[2],
    borderTopColor: theme.colors.border,
    borderTopWidth: theme.stroke.sm,
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
}));

export const Input = withUnistyles(TextInput, (theme) => ({
  placeholderTextColor: theme.colors.placeholder,
  selectionColor: theme.colors.primary,
}));

export const Container = withUnistyles(BlurView);
