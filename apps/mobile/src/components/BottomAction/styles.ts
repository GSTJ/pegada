import styled from "styled-components/native";

import { BlurView } from "@/components/BlurView";

export const Container = styled(BlurView)`
  padding: ${(props) => props.theme.spacing[4]}px;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;

  border-color: ${(props) => props.theme.colors.border};
  border-top-width: ${(props) => props.theme.stroke.md}px;
`;
