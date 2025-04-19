import styled from "styled-components/native";

import { Image } from "@/components/Image";
import { PressableArea } from "@/components/PressableArea";

export const Container = styled(PressableArea)`
  padding: ${(props) => props.theme.spacing[4]}px;
  flex-direction: row;
  align-items: center;
`;

export const PICTURE_SIZE = 55;
export const Picture = styled(Image)`
  width: ${PICTURE_SIZE}px;
  height: ${PICTURE_SIZE}px;
  border-radius: ${(props) => props.theme.radii.round}px;
  margin-right: ${(props) => props.theme.spacing[3.5]}px;
  background-color: ${({ theme }) => theme.colors.card};
`;

export const EmojiContainer = styled.View`
  position: absolute;
  bottom: -${(props) => props.theme.spacing[1]}px;
  right: ${(props) => props.theme.spacing[1]}px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${(props) => props.theme.radii.round}px;
  padding: ${(props) => props.theme.spacing[1]}px;
  border-width: ${(props) => props.theme.stroke.md}px;
  border-color: ${({ theme }) => theme.colors.border};
`;
