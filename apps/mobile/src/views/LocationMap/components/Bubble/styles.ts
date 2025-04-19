import Animated from "react-native-reanimated";
import LottieView from "lottie-react-native";
import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Swipe = styled(LottieView).attrs({
  resizeMode: "cover",
  autoPlay: true,
  source: require("@/assets/animations/swipe.json")
})`
  width: ${(props) => props.theme.spacing[6]}px;
  height: ${(props) => props.theme.spacing[6]}px;
  right: -${(props) => props.theme.spacing[1]}px;
`;

export const Container = styled(Animated.View)`
  position: absolute;
  padding: ${(props) => props.theme.spacing[2.5]}px
    ${(props) => props.theme.spacing[4]}px;
  background: ${(props) => props.theme.colors.background};
  border: 1px ${(props) => props.theme.colors.border};
  align-items: center;
  border-radius: ${(props) => props.theme.radii.md}px;
  top: -70px;
`;

export const Row = styled.View`
  justify-content: center;
  align-items: center;
  flex-direction: row;
`;

export const Content = styled.View`
  align-items: center;
`;

export const Rect = styled.View`
  position: absolute;
  bottom: -${(props) => props.theme.spacing[1.5]}px;
  width: ${(props) => props.theme.spacing[2.5]}px;
  height: ${(props) => props.theme.spacing[2.5]}px;
  background: ${(props) => props.theme.colors.background};

  border-left-width: ${(props) => props.theme.stroke.md}px;
  border-bottom-width: ${(props) => props.theme.stroke.md}px;
  border-left-color: ${(props) => props.theme.colors.border};
  border-bottom-color: ${(props) => props.theme.colors.border};
  transform: rotate(-45deg);
`;

export const Title = styled(Text).attrs({
  fontWeight: "bold",
  fontSize: "sm"
})``;

export const Description = styled(Text).attrs({
  fontSize: "sm"
})``;
