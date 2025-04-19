import Animated from "react-native-reanimated";
import Color from "color";
import styled from "styled-components/native";

// Should preload for a better dog experience, so no inline requires
import confusedEmoji from "@/assets/images/ConfusedEmoji.webp";
import heartEyesEmoji from "@/assets/images/HeartEyesEmoji.webp";
import thinkingEmoji from "@/assets/images/ThinkingEmoji.webp";
import { Image } from "@/components/Image";
import { PressableArea } from "@/components/PressableArea";

export const Container = styled(Animated.View).attrs({
  pointerEvents: "box-none"
})`
  width: 100%;

  justify-content: space-around;
  align-items: center;
  flex-direction: row;

  position: absolute;
  align-self: center;
  bottom: ${(props) => props.theme.spacing[6]}px;
  padding: 0 ${(props) => props.theme.spacing[2]}px;
`;

export const ActionItem = styled(PressableArea)`
  padding: ${(props) => props.theme.spacing[2.5]}px;
  background-color: ${(props) =>
    Color(props.theme.colors.primary).alpha(0.1).rgb().string()};

  border-radius: ${(props) => props.theme.radii.round}px;
`;

export const ConfusedEmoji = styled(Image).attrs({
  source: confusedEmoji
})`
  width: 55px;
  height: 55px;
`;

export const ThinkingEmoji = styled(Image).attrs({
  source: thinkingEmoji
})`
  width: 35px;
  height: 35px;
`;

export const HeartEyesEmoji = styled(ConfusedEmoji).attrs({
  source: heartEyesEmoji
})``;
