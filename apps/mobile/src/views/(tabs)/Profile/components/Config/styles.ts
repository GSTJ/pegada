import { Pressable } from "react-native";
import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Root = styled(Pressable)`
  flex-direction: row;
  align-items: center;
  gap: ${(props) => props.theme.spacing[3.5]}px;
  padding: ${(props) => props.theme.spacing[4]}px;
`;

export const Container = styled.View`
  flex: 1;
`;

export const ArrowContainer = styled.View`
  align-items: flex-end;
`;

export const Title = styled(Text).attrs((props) => ({
  numberOfLines: 1,
  fontWeight: "semibold",
  fontSize: "sm",
  ...props
}))``;

export const Description = styled(Text).attrs((props) => ({
  numberOfLines: 2,
  fontSize: "xs",
  ...props
}))``;
