import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

import { TransparentGlassOrDarkBlurView } from "@/components/BlurView";
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

export const HeartEyesContainer = styled(TransparentGlassOrDarkBlurView)`
  border-radius: ${(props) => props.theme.radii.round}px;
  overflow: hidden;
  padding: ${(props) => props.theme.spacing[1.5]}px;
  margin-top: -35px;
  margin-bottom: ${(props) => props.theme.spacing[2]}px;
`;
