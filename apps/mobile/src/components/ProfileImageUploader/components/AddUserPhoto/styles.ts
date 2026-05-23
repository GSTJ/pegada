import Animated from "react-native-reanimated";
import styled from "styled-components/native";

import Dog from "@/assets/images/Dog.svg";
import { Image } from "@/components/Image";
import { PressableArea } from "@/components/PressableArea";
import { width } from "@/constants";

export const containerPadding = 16;
export const numOfColumns = 3;
export const dogPictureWidth = (width - containerPadding * 2) / numOfColumns;
export const dogPictureHeight = dogPictureWidth * 1.3;

const AnimatedImage = Animated.createAnimatedComponent(Image);

export const DebugImageStatusContainer = styled.View`
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  right: 0;
  padding: ${(props) => props.theme.spacing[1]}px;
  border-bottom-left-radius: ${(props) => props.theme.radii.sm}px;
  background-color: rgba(0, 0, 0, 0.7);
`;

export const UserPictureContent = styled.View`
  border-radius: ${(props) => props.theme.radii.md}px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
  flex: 1;
  border: ${(props) => props.theme.stroke.md}px;
  border-color: ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.input};
`;

export const AnimatedOverlay = styled(Animated.View)`
  background-color: #00000050;
  width: 100%;
  flex: 1;
  justify-content: center;
`;

export const UserPicture = styled(AnimatedImage)`
  position: absolute;
  width: 100%;
  height: 100%;
`;

export const UserPictureContainer = styled.View`
  padding: ${(props) => props.theme.spacing[1.5]}px;
  width: ${dogPictureWidth}px;
  height: ${dogPictureHeight}px;
`;

export const AddRemoveContainer = styled(PressableArea)<{
  inverted: boolean;
}>`
  border-radius: ${(props) => props.theme.radii.round}px;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: 0;
  right: 0;
  background-color: ${(props) =>
    props.inverted ? props.theme.colors.input : props.theme.colors.primary};

  border: ${(props) => props.theme.stroke.md}px;
  border-color: ${(props) =>
    props.inverted ? props.theme.colors.border : props.theme.colors.primary};
`;

export const FadedDog = styled(Dog)`
  opacity: 0.5;
`;

/**
 * MAESTRO_E2E placeholder skip button. Visible but unobtrusive — pinned to
 * the bottom edge of the photo cell so a Maestro `point` tap can target it
 * without occluding the centered FadedDog (which is the real human tap
 * target on non-Maestro runs). Rendered only when both gates pass in
 * `AddUserPhoto.showMaestroSkip` — production builds short-circuit on
 * `config.ENV === "production"` so they never instantiate this style.
 */
export const MaestroSkipPressable = styled(PressableArea)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
`;
