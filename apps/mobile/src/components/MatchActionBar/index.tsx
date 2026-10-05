import * as React from "react";
import Animated, { Easing, Keyframe, ReduceMotion } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import {
  type BlurEffectPolicy,
  type BlurSurfaceMode,
  useResolvedBlurSurfaceMode,
} from "@/components/BlurView";

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
  /** Use `opacity-safe` while the complete action bar is alpha-hidden. */
  blurEffectPolicy?: BlurEffectPolicy;
}

const ACTION_ENTRY_OFFSET = 25;
const ACTION_ENTRY_DURATION = 220;
const ACTION_EXIT_OFFSET = 96;
const ACTION_EXIT_DURATION = 180;

const createActionEntry = (delay: number) =>
  new Keyframe({
    0: { transform: [{ translateY: ACTION_ENTRY_OFFSET }] },
    100: {
      transform: [{ translateY: 0 }],
      easing: Easing.out(Easing.cubic),
    },
  })
    .duration(ACTION_ENTRY_DURATION)
    .delay(delay)
    .reduceMotion(ReduceMotion.System);

const createActionExit = () =>
  new Keyframe({
    0: { transform: [{ translateY: 0 }] },
    100: {
      transform: [{ translateY: ACTION_EXIT_OFFSET }],
      easing: Easing.in(Easing.cubic),
    },
  })
    .duration(ACTION_EXIT_DURATION)
    .reduceMotion(ReduceMotion.System);

/**
 * The pill background behind each action button. Uses a real Liquid Glass
 * effect on supported iOS versions, an opaque card when Reduce Transparency
 * is enabled, and the original tinted fill on older iOS and Android.
 */
const ActionItemBackground = ({ mode }: { mode: BlurSurfaceMode }) => {
  const theme = useTheme();

  if (mode === "glass") {
    return <GlassPillBackground tintColor={theme.colors.primary} colorScheme="dark" />;
  }

  return <ActionItemFallbackBackground $opaque={mode === "opaque"} />;
};

export const MatchActionBar: React.FC<MatchActionBarProps> = ({
  onNope,
  onYep,
  onMaybe,
  animated,
  blurEffectPolicy = "stable",
  ...props
}) => {
  const { t } = useTranslation();
  const surfaceMode = useResolvedBlurSurfaceMode(blurEffectPolicy);
  const entryAnimations = React.useMemo(
    () =>
      animated
        ? [createActionEntry(120), createActionEntry(160), createActionEntry(200)]
        : [undefined, undefined, undefined],
    [animated],
  );
  const exitAnimation = React.useMemo(createActionExit, []);
  const shouldRenderLiquidGlass = surfaceMode === "glass";

  return (
    <Container exiting={exitAnimation} {...props}>
      <Animated.View entering={entryAnimations[0]}>
        <ActionItem
          testID="swipe-dislike"
          disableActiveOpacity={shouldRenderLiquidGlass}
          accessibilityRole="button"
          accessibilityLabel={t("swipeActions.pass")}
          onPress={onNope}
        >
          <ActionItemBackground mode={surfaceMode} />
          <ConfusedEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={entryAnimations[1]}>
        <ActionItem
          testID="swipe-maybe"
          disableActiveOpacity={shouldRenderLiquidGlass}
          accessibilityRole="button"
          accessibilityLabel={t("swipeActions.maybe")}
          onPress={onMaybe}
        >
          <ActionItemBackground mode={surfaceMode} />
          <ThinkingEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={entryAnimations[2]}>
        <ActionItem
          testID="swipe-like"
          disableActiveOpacity={shouldRenderLiquidGlass}
          accessibilityRole="button"
          accessibilityLabel={t("swipeActions.like")}
          onPress={onYep}
        >
          <ActionItemBackground mode={surfaceMode} />
          <HeartEyesEmoji />
        </ActionItem>
      </Animated.View>
    </Container>
  );
};
