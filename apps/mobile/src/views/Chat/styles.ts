import Animated, { FadeInUp } from "react-native-reanimated";
import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Container = styled.KeyboardAvoidingView`
  background-color: ${(props) => props.theme.colors.background};
  flex: 1;
`;

export const Background = styled.ImageBackground`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

export const CenteredView = styled(Animated.View).attrs(() => ({
  entering: FadeInUp
}))`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing[6]}px
    ${(props) => props.theme.spacing[3]}px;
`;

export const CenteredText = styled(Text)`
  text-align: center;
`;
