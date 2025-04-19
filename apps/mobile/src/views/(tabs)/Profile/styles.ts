import Animated from "react-native-reanimated";
import Color from "color";
import styled from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";

export const PlanContainer = styled(PressableArea)`
  position: absolute;
  top: ${(props) => props.theme.spacing[4]}px;
  right: ${(props) => props.theme.spacing[4]}px;
  padding: ${(props) => props.theme.spacing[2]}px
    ${(props) => props.theme.spacing[3]}px;
  border-radius: ${(props) => props.theme.radii.sm}px;
  background-color: ${({ theme }) =>
    Color(theme.colors.background).alpha(0.6).string()};
  z-index: 10;
`;

export const ScrollContainer = styled.View`
  overflow: hidden;
`;

export const SettingsList = styled(Animated.ScrollView)`
  flex-grow: 1;
  background-color: transparent;
`;

export const Container = styled.View`
  flex-grow: 1;
`;

export const BackgroundProfileContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: #000;
`;

export const BackgroundOverlay = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #000;
`;

export const Content = styled.View`
  padding: ${(props) => props.theme.spacing[4]}px;
  border-bottom-color: ${({ theme }) => theme.colors.border};
  border-bottom-width: ${(props) => props.theme.stroke.sm}px;
  background-color: ${({ theme }) => theme.colors.background};
`;
