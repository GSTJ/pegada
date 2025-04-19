import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Color from "color";
import styled from "styled-components/native";

import { Image } from "@/components/Image";

export const Container = styled.View`
  background-color: ${(props) => props.theme.colors.background};
  flex: 1;
`;

export const Content = styled(SafeAreaView)`
  flex: 1;
  gap: 10px;
`;

const AnimatedImage = Animated.createAnimatedComponent(Image);
export const RotatedImageLeft = styled(AnimatedImage)`
  border-radius: ${(props) => props.theme.radii.lg}px;
  background-color: ${(props) => props.theme.colors.card};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

export const RotatedImageRight = styled(RotatedImageLeft)`
  position: absolute;
`;

export const HeartEyesContainer = styled.View`
  border-radius: ${(props) => props.theme.radii.round}px;
  background-color: ${(props) =>
    Color(props.theme.colors.primary).alpha(0.5).rgb().string()};
  padding: ${(props) => props.theme.spacing[1.5]}px;
  margin-top: -35px;
  margin-bottom: ${(props) => props.theme.spacing[2]}px;
`;
