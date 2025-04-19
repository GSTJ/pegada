import { LinearGradient } from "expo-linear-gradient";
import Color from "color";
import styled, { DefaultTheme } from "styled-components/native";

import { BlurView } from "@/components/BlurView";

export const Container = styled(BlurView).attrs({
  intensity: 90
})`
  overflow: hidden;
`;

export const getGradientProps = (props: { theme: DefaultTheme }) => ({
  colors: [
    Color(props.theme.colors.card).fade(0.3).rgb().string(),
    Color(props.theme.colors.card).fade(0.5).rgb().string()
  ],
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 }
});

export const Gradient = styled(LinearGradient).attrs(getGradientProps)``;
