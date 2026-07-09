import * as React from "react";
import Animated, { FadeInDown, ZoomOutDown } from "react-native-reanimated";
import { useTheme } from "styled-components/native";

import { isLiquidGlassAvailableSafe } from "@/components/BlurView";
import { useTabBarOverlap } from "@/hooks/useTabBarHeight";

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

  if (isLiquidGlassAvailableSafe()) {
    return (
      <GlassPillBackground
        tintColor={theme.colors.primary}
        colorScheme={theme.dark ? "dark" : "light"}
      />
    );
  }

  return <ActionItemFallbackBackground />;
};

export const MatchActionBar: React.FC<MatchActionBarProps> = ({
  onNope,
  onYep,
  onMaybe,
  animated,
  style,
  ...props
}) => {
  const theme = useTheme();

  // Under iOS Native Tabs the screen extends beneath the translucent
  // (Liquid Glass) tab bar, so the bar's default bottom offset must clear
  // it -- these are interactive controls, not scroll-under content. On
  // Android (JS tabs, overlap 0) this resolves to the same spacing[6] the
  // stylesheet always used. Callers that pass an explicit `bottom` via
  // `style` (e.g. DogProfile, rendered outside the tabs) still win: their
  // style comes last in the array below.
  const tabBarOverlap = useTabBarOverlap();

  const dislikeAnimation = animated ? FadeInDown.delay(300) : undefined;
  const maybeAnimation = animated ? FadeInDown.delay(350) : undefined;
  const likeAnimation = animated ? FadeInDown.delay(400) : undefined;

  return (
    <Container
      exiting={ZoomOutDown}
      style={[{ bottom: theme.spacing[6] + tabBarOverlap }, style]}
      {...props}
    >
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
