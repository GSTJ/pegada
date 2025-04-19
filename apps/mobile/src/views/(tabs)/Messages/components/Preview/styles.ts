import styled from "styled-components/native";

import { Image } from "@/components/Image";
import { PressableArea } from "@/components/PressableArea";

export const Content = styled.View`
  width: 65px;
  align-items: center;
`;

export const Picture = styled(Image)`
  width: 80px;
  height: 100px;
  border-radius: ${(props) => props.theme.radii.md}px;
  margin-bottom: ${(props) => props.theme.spacing[1]}px;

  background-color: ${(props) => props.theme.colors.border};
`;

export const Container = styled(PressableArea)`
  border-radius: ${(props) => props.theme.spacing[2.5]}px;
  align-items: center;
  justify-content: center;
`;
