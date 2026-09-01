import type { IErrorBoundary } from "@/components/NetworkBoundary";
import type { AnimatedProps } from "react-native-reanimated";

import type { ViewProps } from "react-native";

import type { LinearGradientProps } from "expo-linear-gradient";

import { View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { StyleSheet, withUnistyles } from "react-native-unistyles";

import * as PersonalInfo from "@/components/MainCard/components/PersonalInfo/styles";
import { Container } from "@/components/MainCard/styles";
import { UnknownErrorComponent } from "@/components/NetworkBoundary";

const ThemedGradient = withUnistyles(LinearGradient);

/**
 * `UnknownErrorComponent` hands its props to a ScrollView the babel plugin
 * never sees, so the sheet has to arrive resolved.
 */
const ThemedUnknownError = withUnistyles(UnknownErrorComponent);

/** The MainCard shell, squared off because it sits flush under the header. */
export const HeaderCard = ({ style, ...props }: AnimatedProps<ViewProps>) => (
  <Container {...props} style={[styles.headerCard, style]} />
);

/** Bottom-anchored gradient the name and bio sit on top of. */
export const Shade = ({ style, ...props }: LinearGradientProps) => (
  <ThemedGradient {...props} style={[styles.shade, style]} />
);

/** Top-anchored gradient that darkens the status bar area. */
export const Scrim = ({ style, ...props }: LinearGradientProps) => (
  <ThemedGradient {...props} style={[styles.scrim, style]} />
);

export const InfoBlock = ({ style, ...props }: ViewProps) => (
  <PersonalInfo.Container {...props} style={[styles.infoBlock, style]} />
);

export const NameRow = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.nameRow, style]} />
);

export const ProfileContainer = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.profileContainer, style]} />
);

/**
 * Stays a component: the boundary takes it as an `errorFallback` value, and
 * calls it with the reset handlers this one has no use for.
 */
export const ProfileUnknownError: IErrorBoundary = () => (
  <ThemedUnknownError style={styles.profileUnknownError} />
);

export const styles = StyleSheet.create((theme) => ({
  headerCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
  },
  shareButton: {
    position: "absolute",
    right: theme.spacing[4],
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    overflow: "hidden",
    zIndex: 2,
  },
  shareButtonGlass: {
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
  },
  shareButtonContent: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  shade: {
    marginTop: "auto",
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  infoBlock: {
    paddingBottom: 35,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.card,
  },
  profileUnknownError: {
    backgroundColor: theme.colors.card,
  },
}));
