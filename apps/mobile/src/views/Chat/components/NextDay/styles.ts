import Color from "color";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

const CONTAINER_SHADOW_COLOR = "#000";

export const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: theme.spacing[4],
    marginRight: "auto",
    marginBottom: theme.spacing[5],
    marginLeft: "auto",
    paddingTop: theme.spacing[0.5],
    paddingRight: theme.spacing[2.5],
    paddingBottom: theme.spacing[1.5],
    paddingLeft: theme.spacing[2.5],
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
    elevation: 1,
    shadowColor: CONTAINER_SHADOW_COLOR,
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.1,
    shadowRadius: 0.5,
  },
  dateText: {
    color: new Color(theme.colors.text).alpha(0.5).string(),
  },
}));

export const DateText = Text;
