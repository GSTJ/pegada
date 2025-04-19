import LottieView from "lottie-react-native";
import styled from "styled-components/native";

import * as LikeFeedbackStyles from "@/components/FeedbackCard/components/LikeFeedback/styles";
import { Text } from "@/components/Text";

export const Container = styled(LikeFeedbackStyles.Container)`
  background-color: transparent;
`;

export const EmptyAnimation = styled(LottieView).attrs({
  autoPlay: true,
  source: require("@/assets/animations/empty.json")
})`
  width: 100px;
  height: 100px;
`;

export const LogoLoading = styled(LottieView).attrs({
  autoPlay: true,
  source: require("@/assets/animations/loadingLogo.json"),
  speed: 0.5
})`
  width: 150px;
  height: 150px;
  margin: auto;
`;

export const Title = styled(Text)`
  margin-bottom: ${(props) => props.theme.spacing[1]}px;
  text-align: center;
`;

export const Description = styled(Text)`
  text-align: center;
  margin-bottom: ${(props) => props.theme.spacing[4]}px;
  max-width: 274px;
`;
