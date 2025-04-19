import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Container = styled.View`
  padding: ${(props) => props.theme.spacing[6]}px;
  padding-bottom: ${(props) => props.theme.spacing[28]}px;
  padding-top: ${(props) => props.theme.spacing[12]}px;
`;

export const Name = styled(Text).attrs({
  fontWeight: "black",
  fontSize: "xl"
})`
  color: #fff;
  margin-bottom: ${(props) => props.theme.spacing[1]}px;
`;

export const Age = styled(Name).attrs({
  fontWeight: "medium"
})`
  font-size: 18px;
`;

export const Description = styled(Text)`
  color: #fff;
`;
