import Animated from "react-native-reanimated";
import Color from "color";
import styled from "styled-components/native";

// Should preload for a better dog experience, so no inline requires
import confusedEmoji from "@/assets/images/ConfusedEmoji.webp";
import heartEyesEmoji from "@/assets/images/HeartEyesEmoji.webp";
import thinkingEmoji from "@/assets/images/ThinkingEmoji.webp";
import { Image } from "@/components/Image";
import { PressableArea } from "@/components/PressableArea";

// Apple HIG recommends a minimum 44x44pt hit area for tappable targets.
const MIN_TOUCH_TARGET = 44;

export const Container = styled(Animated.View).attrs({
  // box-none keeps the bar itself non-blocking so the card below stays
  // pannable in the gaps, but lifts the bar above the card visually so
  // each ActionItem reliably wins taps over the card's PersonalInfo
  // pressable that sits underneath.
  pointerEvents: "box-none",
})`
  width: 100%;

  justify-content: space-around;
  align-items: center;
  flex-direction: row;

  position: absolute;
  align-self: center;
  bottom: ${(props) => props.theme.spacing[6]}px;
  padding: 0 ${(props) => props.theme.spacing[2]}px;

  z-index: 10;
  elevation: 10;
`;

export const ActionItem = styled(PressableArea).attrs({
  // Hit target expansion so taps that land just outside the visible
  // button still register on the action, never falling through to the
  // card's PersonalInfo pressable underneath (which would open the
  // dog profile instead).
  hitSlop: { top: 12, bottom: 12, left: 12, right: 12 },
})`
  padding: ${(props) => props.theme.spacing[2.5]}px;
  background-color: ${(props) => Color(props.theme.colors.primary).alpha(0.1).rgb().string()};

  border-radius: ${(props) => props.theme.radii.round}px;

  /* Guarantee the Apple HIG minimum even when the emoji shrinks. */
  min-width: ${MIN_TOUCH_TARGET}px;
  min-height: ${MIN_TOUCH_TARGET}px;
  align-items: center;
  justify-content: center;
`;

export const ConfusedEmoji = styled(Image).attrs({
  source: confusedEmoji,
})`
  width: 55px;
  height: 55px;
`;

export const ThinkingEmoji = styled(Image).attrs({
  source: thinkingEmoji,
})`
  width: 35px;
  height: 35px;
`;

export const HeartEyesEmoji = styled(ConfusedEmoji).attrs({
  source: heartEyesEmoji,
})``;
