import { ImageBackground } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import { Text } from "@/components/text";

export const styles = StyleSheet.create((theme) => ({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  pressableContainer: {
    flexGrow: 1,
  },
  keyboardAvoidingViewStyled: {
    flexGrow: 1,
  },
  logoStyled: {
    marginBottom: 25,
  },
  topCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: theme.spacing[10],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[10],
    paddingLeft: theme.spacing[4],
  },
  bottomCard: {
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing[4],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[4],
    paddingLeft: theme.spacing[4],
    borderTopColor: theme.colors.border,
    borderTopWidth: theme.stroke.md,
  },
  title: {
    color: theme.colors.text,
    marginBottom: theme.spacing[1],
  },
  highlight: {
    color: theme.colors.primary,
    marginBottom: theme.spacing[1],
  },
  description: {
    color: theme.colors.text,
  },
  pendingDogProfile: {
    color: theme.colors.text,
    marginTop: theme.spacing[2],
  },
}));

export const Container = withUnistyles(SafeAreaView);

export const LogoStyled = withUnistyles(Logo);

export const TopCard = withUnistyles(ImageBackground, (theme) => ({
  imageStyle: {
    opacity: 0.2,
    backgroundColor: theme.colors.background,
    transform: [{ scale: 1.05 }],
  },
}));

export const Title = Text;

export const Highlight = Text;

export const Description = Text;
