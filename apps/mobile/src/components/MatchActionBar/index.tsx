import * as React from "react";
import Animated, { FadeInDown, ZoomOutDown } from "react-native-reanimated";

import {
  ActionItem,
  ConfusedEmoji,
  Container,
  HeartEyesEmoji,
  ThinkingEmoji,
} from "./styles";
import { PressableArea } from "@/components/PressableArea";

interface MatchActionBarProps extends React.ComponentProps<typeof Container> {
  onNope: () => void;
  onYep: () => void;
  onMaybe: () => void;
  animated?: boolean;
}

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

export const MatchActionBar: React.FC<MatchActionBarProps> = ({
  onNope,
  onYep,
  onMaybe,
  animated,
  ...props
}) => {
  const dislikeAnimation = animated ? FadeInDown.delay(300) : undefined;
  const maybeAnimation = animated ? FadeInDown.delay(350) : undefined;
  const likeAnimation = animated ? FadeInDown.delay(400) : undefined;
  return (
    <Container exiting={ZoomOutDown} {...props}>
      <Animated.View entering={dislikeAnimation}>
        <PressableArea
          hitSlop={hitSlop}
          testID="swipe-dislike"
          onPress={onNope}
        >
          <ActionItem>
            <ConfusedEmoji />
          </ActionItem>
        </PressableArea>
      </Animated.View>
      <Animated.View entering={maybeAnimation}>
        <PressableArea hitSlop={hitSlop} testID="swipe-maybe" onPress={onMaybe}>
          <ActionItem>
            <ThinkingEmoji />
          </ActionItem>
        </PressableArea>
      </Animated.View>
      <Animated.View entering={likeAnimation}>
        <PressableArea hitSlop={hitSlop} testID="swipe-like" onPress={onYep}>
          <ActionItem>
            <HeartEyesEmoji />
          </ActionItem>
        </PressableArea>
      </Animated.View>
    </Container>
  );
};
