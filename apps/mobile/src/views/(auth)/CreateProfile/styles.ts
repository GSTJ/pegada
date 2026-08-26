import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Input } from "@/components/Input";
import { Text } from "@/components/text";

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  photoHint: {
    marginBottom: 10,
  },
  dragHint: {
    marginTop: 5,
  },
  multilineInput: {
    minHeight: 75,
  },
});

export const PhotoHint = Text;

export const DragHint = Text;

export const MultilineInput = withUnistyles(Input);
