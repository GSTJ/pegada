import styled from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";

export const Container = styled(PressableArea)`
  border-radius: ${(props) => props.theme.radii.md}px;
  border-width: ${(props) => props.theme.stroke.lg}px;
  border-color: ${(props) => props.theme.colors.border};
  width: 50px;
  height: 50px;
  justify-content: center;
  align-items: center;
  background-color: ${(props) => props.theme.colors.background};
  // Optically align
  padding-right: ${(props) => props.theme.spacing[0.5]}px;
`;
