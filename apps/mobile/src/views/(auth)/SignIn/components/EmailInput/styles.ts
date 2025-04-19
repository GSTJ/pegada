import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Container = styled.View`
  margin-top: ${(props) => props.theme.spacing[5]}px;
  margin-bottom: ${(props) => props.theme.spacing[3.5]}px;
`;

export const Content = styled.View`
  border-radius: ${(props) => props.theme.radii.md}px;
  border: 1px ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.input};
  overflow: hidden;
`;

export const TextInput = styled.TextInput.attrs((props) => ({
  placeholderTextColor: props.theme.colors.placeholder
}))`
  padding: ${(props) => props.theme.spacing[4]}px 20px;
  font-family: ${(props) => props.theme.typography.fontFamily.medium};
  font-weight: medium;
  font-size: ${(props) => props.theme.typography.sizes.lg.size}px;
  color: ${(props) => props.theme.colors.text};
`;

export const ErrorText = styled(Text)`
  margin-top: 5px;
`;
