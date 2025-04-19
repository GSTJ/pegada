import { LinearGradient } from "expo-linear-gradient";
import Color from "color";
import { clamp } from "lodash";
import styled from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";
import { height, width } from "@/constants";

const ASPECT_RATIO = 4 / 3;
const MAX_HEIGHT = height * 0.5;
const MIN_HEIGHT = height * 0.4;
const IDEAL_HEIGHT = width * ASPECT_RATIO;

export const CARD_HEIGHT = clamp(IDEAL_HEIGHT, MIN_HEIGHT, MAX_HEIGHT);

export const Container = styled.ScrollView.attrs({
  bounces: false
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
  hitSlop: { top: 10, bottom: 10, right: 20, left: 20 }
})`
  align-self: center;
`;

export const ReportButton = styled(PressableArea).attrs({
  hitSlop: { top: 10, bottom: 10, right: 20, left: 20 }
})`
  align-self: center;
`;

export const MatchActionBarGradient = styled(LinearGradient).attrs((props) => {
  const gradientColor = Color(props.theme.colors.background);

  return {
    colors: [
      gradientColor.fade(1).rgb().string(),
      gradientColor.fade(0.2).rgb().string(),
      gradientColor.fade(0.2).rgb().string(),
      gradientColor.fade(0).rgb().string()
    ],
    pointerEvents: "none"
  };
})`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;

export const UnmatchButton = styled(PressableArea).attrs({
  hitSlop: { top: 10, bottom: 10, right: 20, left: 20 }
})`
  align-self: center;
`;

export const Name = styled(Text).attrs({
  fontWeight: "black",
  fontSize: "xl"
})`
  margin-bottom: ${(props) => props.theme.spacing[1]}px;
`;

export const Age = styled(Name).attrs({
  fontWeight: "medium"
})`
  font-size: 18px;
`;

export const Description = styled(Text)`
  margin-top: ${(props) => props.theme.spacing[2]}px;
  margin-bottom: ${(props) => props.theme.spacing[12]}px;
`;
