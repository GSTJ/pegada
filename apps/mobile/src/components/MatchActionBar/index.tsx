import * as React from "react";
import Animated, { FadeInDown, ZoomOutDown } from "react-native-reanimated";

import {
  ActionItem,
  ConfusedEmoji,
  Container,
  HeartEyesEmoji,
  ThinkingEmoji
} from "./styles";

interface MatchActionBarProps extends React.ComponentProps<typeof Container> {
  onNope: () => void;
  onYep: () => void;
  onMaybe: () => void;
  animated?: boolean;
}

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
        <ActionItem onPress={onNope}>
          <ConfusedEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={maybeAnimation}>
        <ActionItem onPress={onMaybe}>
          <ThinkingEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={likeAnimation}>
        <ActionItem onPress={onYep}>
          <HeartEyesEmoji />
        </ActionItem>
      </Animated.View>
    </Container>
  );
};
