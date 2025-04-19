import Animated from "react-native-reanimated";
import styled from "styled-components/native";

import { TransparentAndroidDarkBlurView } from "@/components/BlurView";

export const Content = styled.View`
  padding: ${(props) => props.theme.spacing[1]}px;
  margin-bottom: auto;
  align-items: center;
`;

export const Container = styled(TransparentAndroidDarkBlurView)`
  border-top-left-radius: ${(props) => props.theme.radii.md}px;
  border-bottom-left-radius: ${(props) => props.theme.radii.md}px;
  margin-bottom: auto;
  align-self: flex-end;
  width: 24px;
  overflow: hidden;
`;

interface IDot {
  active: boolean;
}

export const Dot = styled(Animated.View)<IDot>`
  background-color: #fff;
  opacity: ${(props) => (props.active ? 1 : 0.6)};
  border-radius: ${(props) => props.theme.radii.md}px;
  margin: ${(props) => props.theme.spacing[1]}px;
`;
