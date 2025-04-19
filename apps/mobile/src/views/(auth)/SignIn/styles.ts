import { KeyboardAvoidingView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

import Logo from "@/assets/images/Logo";
import { Text } from "@/components/Text";

export const Container = styled(SafeAreaView).attrs({
  edges: ["left", "right"]
})`
  flex: 1;
`;

export const PressableContainer = styled(Pressable)`
  flex-grow: 1;
`;

export const KeyboardAvoidingViewStyled = styled(KeyboardAvoidingView)`
  flex-grow: 1;
`;

export const LogoStyled = styled(Logo)`
  margin-bottom: 25px;
`;

export const TopCard = styled.ImageBackground.attrs((props) => ({
  imageStyle: {
    opacity: 0.2,
    backgroundColor: props.theme.colors.background,
    transform: [{ scale: 1.05 }]
  }
}))`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
  justify-content: center;
  align-items: center;
  padding: ${(props) => props.theme.spacing[10]}px
    ${(props) => props.theme.spacing[4]}px;
`;

export const BottomCard = styled.View`
  background-color: ${(props) => props.theme.colors.background};
  padding: ${(props) => props.theme.spacing[4]}px;
  border-top-color: ${(props) => props.theme.colors.border};
  border-top-width: ${(props) => props.theme.stroke.md}px;
`;

export const Title = styled(Text).attrs({
  fontSize: "xl",
  fontWeight: "bold"
})`
  color: ${(props) => props.theme.colors.text};
  margin-bottom: ${(props) => props.theme.spacing[1]}px;
`;

export const Highlight = styled(Title)`
  color: ${(props) => props.theme.colors.primary};
`;

export const Description = styled(Text)`
  color: ${(props) => props.theme.colors.text};
`;
