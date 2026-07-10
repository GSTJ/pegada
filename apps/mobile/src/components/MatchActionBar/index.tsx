import * as React from "react";
import Animated, { FadeInDown, ZoomOutDown } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "styled-components/native";

import { isLiquidGlassAvailableSafe } from "@/components/BlurView";

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

/**
 * The pill background behind each action button. Uses a real Liquid Glass
 * effect on iOS 26+ (`isLiquidGlassAvailableSafe()`), and falls back to the
 * original tinted-transparent fill everywhere else (older iOS, Android, or
 * if the native module is missing).
 */
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
        <ActionItem testID="swipe-dislike" onPress={onNope}>
          <ActionItemBackground />
          <ConfusedEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={maybeAnimation}>
        <ActionItem testID="swipe-maybe" onPress={onMaybe}>
          <ActionItemBackground />
          <ThinkingEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={likeAnimation}>
        <ActionItem testID="swipe-like" onPress={onYep}>
          <ActionItemBackground />
          <HeartEyesEmoji />
        </ActionItem>
      </Animated.View>
    </Container>
  );
};
