import * as React from "react";
import LottieView from "lottie-react-native";
import styled from "styled-components/native";

import * as LikeFeedbackStyles from "@/components/FeedbackCard/components/LikeFeedback/styles";
import { Text } from "@/components/Text";

export const Container = styled(LikeFeedbackStyles.Container)`
  background-color: transparent;
`;

export const EmptyAnimation = () => (
  <LottieView
    autoPlay
    source={require("@/assets/animations/empty.json")}
    style={{ width: 100, height: 100 }}
  />
);

export const LogoLoading = () => (
  <LottieView
    autoPlay
    source={require("@/assets/animations/loadingLogo.json")}
    speed={0.5}
    style={{ width: 150, height: 150, margin: "auto" }}
  />
);

export const Title = styled(Text)`
  margin-bottom: ${(props) => props.theme.spacing[1]}px;
  text-align: center;
`;

export const Description = styled(Text)`
  text-align: center;
  margin-bottom: ${(props) => props.theme.spacing[4]}px;
  max-width: 274px;
`;
