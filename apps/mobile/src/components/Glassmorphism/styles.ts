import { LinearGradient } from "expo-linear-gradient";

import Color from "color";
import styled, { type DefaultTheme } from "styled-components/native";

import { BlurView } from "@/components/blur-view";

export const Container = styled(BlurView).attrs({
  intensity: 90,
})`
  overflow: hidden;
`;

export const getGradientProps = (props: { theme: DefaultTheme }) => ({
  colors: [
    new Color(props.theme.colors.card).fade(0.3).rgb().string(),
    new Color(props.theme.colors.card).fade(0.5).rgb().string(),
  ],
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
});

export const Gradient = styled(LinearGradient).attrs(getGradientProps)``;
