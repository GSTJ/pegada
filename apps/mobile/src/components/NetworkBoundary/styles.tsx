import * as React from "react";
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

export const DisconnectedIllustration = () => (
  <LottieView
    autoPlay
    loop
    source={require("@/assets/animations/disconnected.json")}
    style={{ width: 150, height: 150, alignSelf: "center" }}
  />
);

export const ErrorIllustration = () => (
  <LottieView
    autoPlay
    loop
    source={require("@/assets/animations/error.json")}
    style={{ width: 150, height: 150, alignSelf: "center" }}
  />
);
