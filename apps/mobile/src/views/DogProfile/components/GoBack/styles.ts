import styled from "styled-components/native";

import { TransparentGlassOrDarkBlurView } from "@/components/BlurView";
import { PressableArea } from "@/components/PressableArea";

const BACK_CONTAINER_SIZE = 60;
const HIT_SLOP = {
  top: 15,
  bottom: 15,
  left: 15,
  right: 15,
};

export const Container = styled(PressableArea).attrs({
  hitSlop: HIT_SLOP,
  pointerEvents: "box-only",
})`
  margin-top: ${-BACK_CONTAINER_SIZE / 2}px;
  right: ${(props) => props.theme.spacing[4]}px;
  align-self: flex-end;
  z-index: 2;
`;

export const Content = styled(TransparentGlassOrDarkBlurView).attrs({
  isInteractive: true,
  glassEffectStyle: "regular",
})`
  width: ${BACK_CONTAINER_SIZE}px;
  height: ${BACK_CONTAINER_SIZE}px;
  border-radius: ${BACK_CONTAINER_SIZE}px;
  overflow: hidden;

  justify-content: center;
  align-items: center;
  padding-top: ${(props) => props.theme.spacing[1]}px;
`;
