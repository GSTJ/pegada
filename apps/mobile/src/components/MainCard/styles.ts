import Animated from "react-native-reanimated";
import styled, { css } from "styled-components/native";

import { Image } from "@/components/Image";

export const absoluteFill = css`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
`;

export const Container = styled(Animated.View)`
  background-color: ${(props) => props.theme.colors.background};
  overflow: hidden;
  padding-top: ${(props) => props.theme.spacing[6]}px;
`;

export const Picture = styled(Image)`
  flex: 1;
  ${absoluteFill}
`;

/**
 * Stable (never remounted) wrapper around the photo. `Picture` itself remounts
 * (via its `key`) whenever the visible photo index changes, so keeping the
 * measure anchor on this always-mounted outer view gives the manual hero
 * transition a stable frame to measure (see @/components/HeroTransition).
 */
export const PhotoAnchor = styled(Animated.View)`
  flex: 1;
  ${absoluteFill}
`;

export const UpperPart = styled.View`
  flex: 1;
`;

export const CarouselContainer = styled.View`
  flex-direction: row;
  ${absoluteFill}
`;

export const PreviousImage = styled.Pressable`
  flex: 1;
`;

export const NextImage = styled.Pressable`
  flex: 1;
`;
