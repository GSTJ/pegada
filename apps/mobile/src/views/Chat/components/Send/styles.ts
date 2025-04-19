import styled from "styled-components/native";

import { BlurView } from "@/components/BlurView";

export const Input = styled.TextInput.attrs((props) => ({
  placeholderTextColor: props.theme.colors.placeholder,
  selectionColor: props.theme.colors.primary
}))`
  border-radius: ${(props) => props.theme.radii.md}px;
  padding: ${(props) => props.theme.spacing[2]}px
    ${(props) => props.theme.spacing[4]}px;

  background-color: ${(props) => props.theme.colors.card};

  border-width: ${(props) => props.theme.stroke.sm}px;
  border-color: ${(props) => props.theme.colors.border};

  color: ${(props) => props.theme.colors.text};
  font-family: ${(props) => props.theme.typography.fontFamily.regular};

  font-size: ${(props) => props.theme.typography.sizes.md.size}px;
`;

export const Container = styled(BlurView)`
  padding: 0 ${(props) => props.theme.spacing[2]}px;
  border-top-color: ${(props) => props.theme.colors.border};
  border-top-width: ${(props) => props.theme.stroke.sm}px;

  justify-content: center;

  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;
