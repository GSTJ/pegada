import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Input } from "@/components/Input";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  wideColumn: {
    flexGrow: 1.5,
    flexShrink: 1,
    flexBasis: 0,
  },
  gap: {
    width: theme.spacing[3],
  },
  multilineInput: {
    minHeight: 75,
  },
}));

export const MultilineInput = withUnistyles(Input);
