import Color from "color";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import { BlurView } from "@/components/blur-view";
import { Image } from "@/components/image";
import { PressableArea } from "@/components/pressable-area";

export const styles = StyleSheet.create((theme) => ({
  backTouchArea: {
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
  },
  picture: {
    width: 38,
    height: 38,
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    marginRight: theme.spacing[3.5],
    backgroundColor: new Color(theme.colors.text).alpha(0.2).string(),
  },
  profileInfoContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: "row",
    alignItems: "center",
    marginRight: theme.spacing[16],
  },
  profileInfoLoadingContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 45,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: theme.stroke.sm,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  pressableAreaFlex: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
}));

export const BackTouchArea = withUnistyles(PressableArea);

export const Picture = withUnistyles(Image);

export const Header = withUnistyles(BlurView);

export const PressableAreaFlex = withUnistyles(PressableArea);
