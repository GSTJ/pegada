import LottieView from "lottie-react-native";
import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Container = styled.ScrollView.attrs({
  contentContainerStyle: { flex: 1 }
})``;

export const Content = styled.View`
  justify-content: center;
  align-items: center;
  padding: ${(props) => props.theme.spacing[5]}px;
  flex-grow: 1;
  flex-shrink: 0;
  margin: 0 ${(props) => props.theme.spacing[6]}px;
`;

export const Title = styled(Text).attrs({
  fontSize: "lg",
  fontWeight: "bold"
})`
  text-align: center;
`;

export const ContainedText = styled(Text)`
  max-width: 350px;
  margin-bottom: ${(props) => props.theme.spacing[6]}px;
  text-align: center;
`;

export const DisconnectedIllustration = styled(LottieView).attrs({
  autoPlay: true,
  loop: true,
  source: require("@/assets/animations/disconnected.json")
})`
  width: 150px;
  height: 150px;
  align-self: center;
`;

export const ErrorIllustration = styled(LottieView).attrs({
  autoPlay: true,
  loop: true,
  delay: 2000,
  source: require("@/assets/animations/error.json")
})`
  height: 150px;
  width: 150px;
  align-self: center;
`;
