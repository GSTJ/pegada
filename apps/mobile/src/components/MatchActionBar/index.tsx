import * as React from "react";
import Animated, { FadeInDown, ZoomOutDown } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "styled-components/native";

import { isLiquidGlassAvailableSafe } from "@/components/BlurView";
import { PressableArea } from "@/components/PressableArea";

import { GlassPillBackground } from "./GlassPillBackground";
import {
  ActionItem,
  ActionItemFallbackBackground,
  ConfusedEmoji,
  Container,
  HeartEyesEmoji,
  ThinkingEmoji,
} from "./styles";

interface MatchActionBarProps extends React.ComponentProps<typeof Container> {
  onNope: () => void;
  onYep: () => void;
  onMaybe: () => void;
  animated?: boolean;
}

const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

const ActionItemBackground = () => {
  const theme = useTheme();
  const isFocused = useIsFocused();

  if (isFocused && isLiquidGlassAvailableSafe()) {
    return <GlassPillBackground tintColor={theme.colors.primary} colorScheme="dark" />;
  }

  return <ActionItemFallbackBackground />;
};

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
        <PressableArea hitSlop={hitSlop} testID="swipe-dislike" onPress={onNope}>
          <ActionItem>
            <ActionItemBackground />
            <ConfusedEmoji />
          </ActionItem>
        </PressableArea>
      </Animated.View>
      <Animated.View entering={maybeAnimation}>
        <PressableArea hitSlop={hitSlop} testID="swipe-maybe" onPress={onMaybe}>
          <ActionItem>
            <ActionItemBackground />
            <ThinkingEmoji />
          </ActionItem>
        </PressableArea>
      </Animated.View>
      <Animated.View entering={likeAnimation}>
        <PressableArea hitSlop={hitSlop} testID="swipe-like" onPress={onYep}>
          <ActionItem>
            <ActionItemBackground />
            <HeartEyesEmoji />
          </ActionItem>
        </PressableArea>
      </Animated.View>
    </Container>
  );
};
