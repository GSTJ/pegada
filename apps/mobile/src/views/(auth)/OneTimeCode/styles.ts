import { KeyboardAvoidingView } from "react-native";
import styled from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";

export const Container = styled.View`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

export const Content = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const ResendCode = styled(PressableArea)`
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.secondary};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  border-radius: ${(props) => props.theme.radii.md}px;
  padding: ${(props) => props.theme.spacing[2.5]}px;
  align-self: center;
`;

export const TopColumn = styled.View`
  justify-content: center;
  align-items: center;
`;

export const Timer = styled(Text).attrs({
  fontSize: "xxxl",
  fontWeight: "bold"
})`
  color: ${(props) => props.theme.colors.text};
`;

export const Description = styled(Text)`
  color: ${(props) => props.theme.colors.text};
  text-align: center;
  margin-top: ${(props) => props.theme.spacing[2.5]}px;
  max-width: 300px;
`;

export const LoadingContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

export const StyledKeyboardAvoidingView = styled(KeyboardAvoidingView)`
  flex-grow: 1;
`;
