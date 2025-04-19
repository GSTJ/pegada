import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Container = styled.View`
  align-items: center;
  max-width: 300px;
  justify-content: center;
`;

export const Title = styled(Text).attrs({
  fontSize: "xxl",
  fontWeight: "bold"
})`
  color: ${(props) => props.theme.colors.text};
`;

export const WhiteTitle = styled(Title)`
  color: ${(props) => props.theme.colors.white};
`;

export const TextHighlight = styled(Title)`
  color: ${(props) => props.theme.colors.primary};
`;

export const UnderlineContainer = styled.View`
  align-self: flex-start;
`;

export const Line = styled.View`
  position: absolute;
  right: 0;
  left: 0;
  bottom: ${(props) => props.theme.spacing[0.5]}px;
  height: 4px;
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: ${(props) => props.theme.radii.round}px;
`;

export const RotatedRectangle = styled.View`
  position: absolute;
  right: 0;
  left: 0;
  width: 110%;
  margin-left: -5%;
  margin-top: -3%;
  top: ${(props) => props.theme.spacing[2]}px;
  height: 37px;
  transform: rotate(-3deg);
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: ${(props) => props.theme.radii.sm}px;
`;

export const FlexRowView = styled.View`
  flex-direction: row;
`;
