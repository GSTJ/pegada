import styled from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";

const BACK_CONTAINER_SIZE = 60;

export const Container = styled(PressableArea).attrs({
  pointerEvents: "box-only",
  hitSlop: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15
  }
})`
  margin-top: ${-BACK_CONTAINER_SIZE / 2}px;
  right: ${(props) => props.theme.spacing[4]}px;
  border-radius: ${BACK_CONTAINER_SIZE}px;
  overflow: hidden;

  align-self: flex-end;

  z-index: 2;

  border-width: ${(props) => props.theme.stroke.sm}px;
  border-color: ${(props) => props.theme.colors.border};
`;

export const Content = styled.View`
  width: ${BACK_CONTAINER_SIZE}px;
  height: ${BACK_CONTAINER_SIZE}px;
  border-radius: ${BACK_CONTAINER_SIZE}px;

  justify-content: center;
  align-items: center;
  padding-top: ${(props) => props.theme.spacing[1]}px;
`;
