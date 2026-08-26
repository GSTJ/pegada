import { StyleSheet, withUnistyles } from "react-native-unistyles";

import * as ModalStyles from "@/components/DefaultModal/styles";
import { CloseButton } from "@/views/UpgradeWall/styles";

export const styles = StyleSheet.create((theme) => ({
  pinnedCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  container: {
    gap: theme.spacing[2],
    paddingTop: theme.spacing[7],
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[1.5],
    width: "100%",
  },
  countdownContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
    paddingTop: theme.spacing[3],
    paddingRight: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    paddingLeft: theme.spacing[3],
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginTop: theme.spacing[3],
    width: "100%",
  },
}));

export const PinnedCloseButton = withUnistyles(CloseButton);

export const Container = withUnistyles(ModalStyles.Container);
