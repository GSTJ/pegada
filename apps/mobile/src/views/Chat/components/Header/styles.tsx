import Color from "color";
import styled from "styled-components/native";

import { BlurView } from "@/components/BlurView";
import { Image } from "@/components/Image";
import { PressableArea } from "@/components/PressableArea";

export const BackTouchArea = styled(PressableArea)`
  padding: ${(props) => props.theme.spacing[4]}px;
`;

export const Picture = styled(Image)`
  width: 38px;
  height: 38px;
  border-radius: ${(props) => props.theme.radii.round}px;
  margin-right: ${(props) => props.theme.spacing[3.5]}px;
  background-color: ${(props) =>
    Color(props.theme.colors.text).alpha(0.2).string()};
`;

export const ProfileInfoContainer = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  margin-right: ${(props) => props.theme.spacing[16]}px;
`;

export const ProfileInfoLoadingContainer = styled(ProfileInfoContainer)`
  justify-content: center;
  margin-right: 45px;
`;

export const Header = styled(BlurView)`
  flex-direction: row;
  align-items: center;
  border-bottom-color: ${(props) => props.theme.colors.border};
  border-bottom-width: ${(props) => props.theme.stroke.sm}px;

  position: absolute;
  top: 0;
  left: 0;
  right: 0;
`;

export const PressableAreaFlex = styled(PressableArea)`
  flex: 1;
`;
