import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { Image } from "@/components/image";
import { Text } from "@/components/text";

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
  note: {
    marginTop: theme.spacing[6],
  },
  imageContainer: {
    paddingTop: theme.spacing[1],
    paddingRight: theme.spacing[1],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[1],
    borderWidth: theme.spacing[1],
    borderColor: theme.colors.primary,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    alignSelf: "center",
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  profileImage: {
    height: 150,
    width: 150,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
  },
}));

export const Note = withUnistyles(Text);

export const ProfileImage = withUnistyles(Image);
