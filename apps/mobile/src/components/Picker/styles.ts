import { TextInput } from "react-native";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import Close from "@/assets/images/Close.svg";
import { PressableArea } from "@/components/pressable-area";

export const styles = StyleSheet.create((theme) => ({
  sheet: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[2],
  },
  handleBar: {
    width: theme.spacing[9],
    height: 4,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.text,
    opacity: 0.3,
  },
  list: {
    flexShrink: 1,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    borderBottomWidth: theme.stroke.md,
    borderColor: theme.colors.border,
  },
  selectItem: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    borderBottomWidth: theme.stroke.md,
    borderColor: theme.colors.border,
    variants: {
      selected: {
        true: {
          backgroundColor: theme.colors.accent,
        },
        false: {
          backgroundColor: theme.colors.background,
        },
        default: {
          backgroundColor: theme.colors.background,
        },
      },
    },
  },
  searchContainer: {
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[1.5],
    paddingBottom: theme.spacing[2],
    paddingLeft: theme.spacing[1.5],
    borderBottomWidth: theme.stroke.md,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  searchInput: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.medium,
    fontWeight: "medium",
    fontSize: theme.typography.sizes.xs.size,
    paddingTop: theme.spacing[1.5],
    paddingRight: theme.spacing[2],
    paddingBottom: theme.spacing[1.5],
    paddingLeft: theme.spacing[2],
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    borderBottomRightRadius: theme.radii.sm,
    borderBottomLeftRadius: theme.radii.sm,
    borderWidth: theme.stroke.md,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.input,
  },
  closeIcon: {},
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
}));

export const SelectItem = withUnistyles(PressableArea);

export const SearchInput = withUnistyles(TextInput, (theme) => ({
  placeholderTextColor: theme.colors.placeholder,
}));

export const CloseIcon = withUnistyles(Close, (theme) => ({
  name: "close",
  width: 14,
  height: 14,
  fill: theme.colors.text,
}));
