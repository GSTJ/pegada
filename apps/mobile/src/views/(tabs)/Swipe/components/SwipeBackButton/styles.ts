import Animated from "react-native-reanimated";
import styled from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";

export const Container = styled(Animated.View)`
  z-index: 20;
  position: absolute;
  right: 0;
`;

export const GoBack = styled(PressableArea)`
  width: 68px;
  height: 50px;

  border-top-left-radius: ${(props) => props.theme.radii.md}px;
  border-bottom-left-radius: ${(props) => props.theme.radii.md}px;

  background-color: ${(props) => props.theme.colors.card};

  justify-content: center;

  margin-left: auto;
  margin-top: ${(props) => props.theme.spacing[24]}px;
  padding-left: ${(props) => props.theme.spacing[4]}px;

  shadow-color: #000;
  shadow-offset: 0 2px;
  shadow-opacity: 0.025;
  shadow-radius: 2px;
  elevation: 25;
`;
