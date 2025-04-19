import Animated from "react-native-reanimated";
import styled, { css } from "styled-components/native";

import MainCard from "../MainCard";
import { absoluteFill } from "../MainCard/styles";

interface IContainer {
  isFirst: boolean;
}

export const Container = styled(Animated.View)<IContainer>`
  margin: ${(props) => props.theme.spacing[1]}px
    ${(props) => props.theme.spacing[1.5]}px;
  flex: 1;
  border-radius: ${(props) => props.theme.radii.lg}px;
  background-color: ${(props) => props.theme.colors.background};
  overflow: hidden;

  ${(props) =>
    props.isFirst &&
    css`
      elevation: 0.5;
      shadow-color: #000;
      shadow-offset: 0px 1px;
      shadow-opacity: 0.1;
      shadow-radius: 1px;
    `}
`;

export const AbsolutePosition = styled(Animated.View).attrs((props) => ({
  pointerEvents: "none",
  ...props
}))`
  flex: 1;
  ${absoluteFill}
`;

export const StyledMainCard = styled(MainCard)`
  flex: 1;
`;
