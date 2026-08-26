import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { PICTURE_SIZE } from "./components/Message/styles";

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  title: {
    paddingTop: 0,
    paddingRight: theme.spacing[4],
    paddingBottom: 0,
    paddingLeft: theme.spacing[4],
  },
  sectionSeparator: {
    height: theme.spacing[2.5],
    backgroundColor: theme.colors.card,
  },
  dividerContainer: {
    marginRight: theme.spacing[4],
    marginLeft: theme.spacing[4] * 2 + PICTURE_SIZE,
  },
  emptyRoot: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    paddingHorizontal: theme.spacing[12],
    paddingBottom: theme.spacing[12],
  },
  emptyTitle: {
    marginTop: 12,
    marginBottom: 10,
    textAlign: "center",
  },
  emptyDescription: {
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 30,
  },
}));

export const EmptyTitle = Text;

export const EmptyDescription = Text;
