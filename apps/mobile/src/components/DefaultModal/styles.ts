import styled from "styled-components/native";

import { Button } from "@/components/Button";
import { Text } from "@/components/Text";

export const OkButton = styled(Button)`
  width: 100%;
  margin-top: ${(props) => props.theme.spacing[4]}px;
`;

export const Container = styled.View`
  background-color: ${(props) => props.theme.colors.background};
  padding: ${(props) => props.theme.spacing[6]}px;
  justify-content: center;
  align-items: center;
  border-radius: ${(props) => props.theme.radii.md}px;
  margin: ${(props) => props.theme.spacing[6]}px;
`;

export const Title = styled(Text).attrs((props) => ({
  fontWeight: "bold",
  fontSize: "lg",
  ...props
}))`
  text-align: center;
`;

export const Description = styled(Text)`
  text-align: center;
`;
