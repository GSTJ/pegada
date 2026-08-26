import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Image } from "@/components/image";
import { PressableArea } from "@/components/pressable-area";

export const styles = StyleSheet.create((theme) => ({
  content: {
    width: 65,
    alignItems: "center",
  },
  picture: {
    width: 80,
    height: 100,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginBottom: theme.spacing[1],
    backgroundColor: theme.colors.border,
  },
  container: {
    borderTopLeftRadius: theme.spacing[2.5],
    borderTopRightRadius: theme.spacing[2.5],
    borderBottomRightRadius: theme.spacing[2.5],
    borderBottomLeftRadius: theme.spacing[2.5],
    alignItems: "center",
    justifyContent: "center",
  },
}));

export const Picture = withUnistyles(Image);

export const Container = withUnistyles(PressableArea);
