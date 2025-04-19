import styled from "styled-components/native";

import { TransparentAndroidDarkBlurView } from "@/components/BlurView";
import { Text } from "@/components/Text";

export const Container = styled(TransparentAndroidDarkBlurView)`
  margin: ${(props) => props.theme.spacing[6]}px;
  margin-top: 0px;
  border-radius: ${(props) => props.theme.radii.md}px;
  margin-bottom: auto;
  overflow: hidden;
  align-self: flex-start;
`;

export const Content = styled.View`
  padding: ${(props) => props.theme.spacing[2.5]}px;
  align-items: center;
  flex-direction: row;
`;

export const DistanceText = styled(Text).attrs({
  fontWeight: "semibold",
  fontSize: "sm"
})`
  margin-left: ${(props) => props.theme.spacing[1]}px;
  margin-bottom: ${(props) => props.theme.spacing[1]}px;
  flex-grow: 0;
  color: #fff;
`;
