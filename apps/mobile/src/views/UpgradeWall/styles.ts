import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Color from "color";
import styled from "styled-components/native";

import Close from "@/assets/images/Close.svg";
import { BlurView } from "@/components/BlurView";
import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";

export const Container = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

export const Content = styled.ScrollView`
  padding: ${({ theme }) => theme.spacing[4]}px;
`;

export const Header = styled(BlurView)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]}px
    ${({ theme }) => theme.spacing[4]}px;
  border-bottom-width: ${({ theme }) => theme.stroke.sm}px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
  position: absolute;
  width: 100%;
`;

export const CloseButton = styled(PressableArea)`
  height: ${({ theme }) => theme.spacing[8]}px;
  width: ${({ theme }) => theme.spacing[8]}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) =>
    Color(theme.colors.text).alpha(0.05).toString()};
  border-radius: ${({ theme }) => theme.radii.round}px;
`;

export const HeroImage = styled(Image)`
  height: 200px;

  border-top-left-radius: ${({ theme }) => theme.radii.xl}px;
  border-bottom-right-radius: ${({ theme }) => theme.radii.xl}px;
`;

export const Title = styled(Text)`
  text-align: center;
`;

export const Subtitle = styled(Text)`
  color: ${({ theme }) => Color(theme.colors.primary).lighten(0.1).toString()};
  text-align: center;
  max-width: 300px;
  align-self: center;
`;

export const CancelAnytime = styled(Text)`
  text-align: center;
`;

export const CloseIcon = styled(Close).attrs((props) => ({
  width: 10,
  height: 10,
  fill: props.theme.colors.text
}))``;

export const GradientEffect = styled(LinearGradient).attrs(() => ({
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
  colors: ["#ffffff00", "#ffffff85", "#ffffff00"]
}))`
  position: absolute;
  top: 0;
  height: 2px;
  width: 100%;
`;
