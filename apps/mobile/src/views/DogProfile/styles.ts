import { StyleSheet } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import Color from "color";
import { clamp } from "lodash";
import styled from "styled-components/native";

import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";
import { height, width } from "@/constants";

const ASPECT_RATIO = 4 / 3;
const MAX_HEIGHT = height * 0.5;
const MIN_HEIGHT = height * 0.4;
const IDEAL_HEIGHT = width * ASPECT_RATIO;

export const CARD_HEIGHT = clamp(IDEAL_HEIGHT, MIN_HEIGHT, MAX_HEIGHT);

export const Container = styled.ScrollView.attrs({
  bounces: false,
})`
  flex-grow: 1;
`;

export const BottomColumn = styled.View``;

export const Content = styled.View`
  padding: ${(props) => props.theme.spacing[4]}px;
  margin-top: ${(props) => -props.theme.spacing[2]}px;
  padding-top: 0;
`;

export const ShareButton = styled(PressableArea).attrs({
  hitSlop: { top: 10, bottom: 10, right: 20, left: 20 },
})`
  align-self: center;
`;

export const ReportButton = styled(PressableArea).attrs({
  hitSlop: { top: 10, bottom: 10, right: 20, left: 20 },
})`
  align-self: center;
`;

export const MatchActionBarGradient = styled(LinearGradient).attrs((props) => {
  const gradientColor = new Color(props.theme.colors.background);

  return {
    colors: [
      gradientColor.fade(1).rgb().string(),
      gradientColor.fade(0.2).rgb().string(),
      gradientColor.fade(0.2).rgb().string(),
      gradientColor.fade(0).rgb().string(),
    ],
    pointerEvents: "none",
  };
})`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;

export const UnmatchButton = styled(PressableArea).attrs({
  hitSlop: { top: 10, bottom: 10, right: 20, left: 20 },
})`
  align-self: center;
`;

export const Name = styled(Text).attrs({
  fontWeight: "black",
  fontSize: "xl",
})`
  margin-bottom: ${(props) => props.theme.spacing[1]}px;
`;

export const Age = styled(Name).attrs({
  fontWeight: "medium",
})`
  font-size: 18px;
`;

export const Description = styled(Text)`
  margin-top: ${(props) => props.theme.spacing[2]}px;
  margin-bottom: ${(props) => props.theme.spacing[12]}px;
`;

/** Centred label shared by the share / unmatch / report actions. */
export const ActionLabel = styled(Text)`
  text-align: center;
`;

export const ErrorScreen = styled.View`
  flex-grow: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

/**
 * `@react-navigation` header slots take style props rather than components, so
 * the static half of each one lives in a sheet and the themed half stays inline.
 */
export const { headerLeft, headerRight, headerTitle } = StyleSheet.create({
  headerLeft: { paddingLeft: 16 },
  headerRight: { paddingRight: 16 },
  headerTitle: { fontWeight: "bold" },
});
