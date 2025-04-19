import styled from "styled-components/native";

export const TitleContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: ${(props) => props.theme.spacing[6]}px;
`;

export const WIDTH = 36;
const HEIGHT = 24;
const TRIANGLE_SIZE = 4;

export const LabelContainer = styled.View`
  position: absolute;
  top: ${HEIGHT + 20}px;
  width: ${WIDTH}px;
  height: ${HEIGHT}px;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.primary};
  border-radius: ${(props) => props.theme.radii.sm}px;
  elevation: 5;
  shadow-color: ${(props) => props.theme.colors.text};
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 2px;
`;

export const Triangle = styled.View`
  position: absolute;
  top: -${TRIANGLE_SIZE / 2}px;
  left: ${WIDTH / 2 - TRIANGLE_SIZE / 2}px;
  width: ${TRIANGLE_SIZE}px;
  height: ${TRIANGLE_SIZE}px;
  background-color: ${(props) => props.theme.colors.primary};
  transform: rotate(45deg);
`;

export const Marker = styled.View`
  height: 20px;
  width: 20px;
  border-radius: ${(props) => props.theme.radii.round}px;
  background-color: ${(props) => props.theme.colors.background};
  border-width: 2.3px;
  border-color: ${(props) => props.theme.colors.primary};
  transform: translateY(1px);
`;
