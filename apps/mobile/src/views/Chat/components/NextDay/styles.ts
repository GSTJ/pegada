import Color from "color";
import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Container = styled.View`
  margin: ${(props) => props.theme.spacing[4]}px auto
    ${(props) => props.theme.spacing[5]}px auto;

  padding: ${(props) => props.theme.spacing[0.5]}px
    ${(props) => props.theme.spacing[2.5]}px
    ${(props) => props.theme.spacing[1.5]}px
    ${(props) => props.theme.spacing[2.5]}px;

  border-radius: ${(props) => props.theme.radii.round}px;
  background-color: ${(props) => props.theme.colors.card};
  border-color: ${(props) => props.theme.colors.border};
  border-width: ${(props) => props.theme.stroke.sm}px;

  elevation: 1;
  shadow-color: #000;
  shadow-offset: 0px 0.5px;
  shadow-opacity: 0.1;
  shadow-radius: 0.5px;
`;

export const DateText = styled(Text)`
  color: ${(props) => Color(props.theme.colors.text).alpha(0.5).string()};
`;
