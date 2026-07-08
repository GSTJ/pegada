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
 * Stable (never remounted) wrapper carrying the shared-element
 * `sharedTransitionTag`. `Picture` itself remounts (via its `key`) every time
 * the visible photo index changes on a card, which would otherwise make
 * Reanimated treat an in-card photo swipe as a shared-element transition.
 * Keeping the tag on this outer, always-mounted view means the transition
 * only fires on the real navigation-driven mount/unmount.
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
