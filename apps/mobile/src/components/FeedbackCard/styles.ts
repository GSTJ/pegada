import Animated from "react-native-reanimated";
import styled, { css } from "styled-components/native";

import MainCard from "../MainCard";
import { SWIPE_CARD_HERO_SHADOW } from "../MainCard/heroShadow";
import { absoluteFill } from "../MainCard/styles";

interface IContainer {
  $isFirst: boolean;
  $heroOwnsShadow: boolean;
  $sourceSurfaceHeld: boolean;
}

interface IClippedCard {
  $sourceSurfaceHeld: boolean;
}

export const Container = styled(Animated.View)<IContainer>`
  margin: ${(props) => props.theme.spacing[1]}px ${(props) => props.theme.spacing[1.5]}px;
  flex: 1;
  border-radius: ${(props) => props.theme.radii.lg}px;
  background-color: ${(props) => props.theme.colors.background};
  overflow: visible;

  ${(props) =>
    props.$isFirst &&
    !props.$heroOwnsShadow &&
    !props.$sourceSurfaceHeld &&
    css`
      elevation: ${SWIPE_CARD_HERO_SHADOW.elevation};
      shadow-color: ${SWIPE_CARD_HERO_SHADOW.color};
      shadow-offset: ${SWIPE_CARD_HERO_SHADOW.offset.width}px
        ${SWIPE_CARD_HERO_SHADOW.offset.height}px;
      shadow-opacity: ${SWIPE_CARD_HERO_SHADOW.opacity};
      shadow-radius: ${SWIPE_CARD_HERO_SHADOW.radius}px;
    `}
`;

/**
 * Keep clipping separate from the native shadow carrier. iOS clips a view's
 * own shadow when that same view uses overflow:hidden, which made the halo
 * disappear during both the boundary tilt and the shared-photo flight.
 */
export const ClippedCard = styled.View<IClippedCard>`
  flex: 1;
  border-radius: ${(props) => props.theme.radii.lg}px;
  background-color: ${(props) => props.theme.colors.background};
  overflow: hidden;
  opacity: ${(props) => (props.$sourceSurfaceHeld ? 0 : 1)};
`;

export const AbsolutePosition = styled(Animated.View).attrs((props) => ({
  pointerEvents: "none",
  ...props,
}))`
  flex: 1;
  ${absoluteFill}
`;

export const StyledMainCard = styled(MainCard)`
  flex: 1;
`;
