import type { HeroRole } from "@/components/HeroTransition/store";

import type { View } from "react-native";

import { useCallback, useEffect, useRef } from "react";
import * as React from "react";

import Animated, { FadeInDown, ZoomOutDown } from "react-native-reanimated";

import {
  createHeroMeasurementLifecycle,
  registerHeroActionFrame,
  unregisterHeroSourceActionFrame,
  useHeroVisibility,
} from "@/components/HeroTransition/store";

import {
  ActionItem,
  ConfusedEmoji,
  Container,
  HeartEyesEmoji,
  ThinkingEmoji,
} from "./styles";

type MatchActionBarProps = React.ComponentProps<typeof Container> & {
  onNope: () => void;
  onYep: () => void;
  onMaybe: () => void;
  animated?: boolean;
  /** dog id this bar shares an action-frame with the hero overlay for. */
  sharedDogId?: string;
  sharedRole?: HeroRole;
  /** the overlay's own non-interactive copy, rendered mid-morph. */
  visualOnly?: boolean;
};

export const MatchActionBar: React.FC<MatchActionBarProps> = ({
  onNope,
  onYep,
  onMaybe,
  animated,
  sharedDogId,
  sharedRole,
  visualOnly,
  ...props
}) => {
  const containerRef = useRef<View>(null);
  const measurementLifecycle = useRef(createHeroMeasurementLifecycle()).current;
  const pendingAnimationFrames = useRef(new Set<number>()).current;
  const hidden = useHeroVisibility(sharedDogId, sharedRole ?? "source");

  const measureSharedFrame = useCallback(() => {
    if (!sharedDogId || !sharedRole) return;
    const generation = measurementLifecycle.current();
    if (generation === null) return;

    const animationFrame = requestAnimationFrame(() => {
      pendingAnimationFrames.delete(animationFrame);
      if (!measurementLifecycle.isCurrent(generation)) return;

      containerRef.current?.measureInWindow((x, y, width, height) => {
        if (!measurementLifecycle.isCurrent(generation)) return;
        if (width > 0 && height > 0) {
          registerHeroActionFrame({
            id: sharedDogId,
            role: sharedRole,
            frame: { x, y, width, height },
          });
        }
      });
    });
    pendingAnimationFrames.add(animationFrame);
  }, [measurementLifecycle, pendingAnimationFrames, sharedDogId, sharedRole]);

  useEffect(() => {
    measurementLifecycle.activate();
    measureSharedFrame();
    return () => {
      // Invalidate first: even a native callback already beyond the RAF
      // cannot publish after this component/id stops owning the frame.
      measurementLifecycle.invalidate();
      for (const animationFrame of pendingAnimationFrames) {
        cancelAnimationFrame(animationFrame);
      }
      pendingAnimationFrames.clear();
      if (sharedDogId && sharedRole === "source") {
        unregisterHeroSourceActionFrame(sharedDogId);
      }
    };
  }, [
    measureSharedFrame,
    measurementLifecycle,
    pendingAnimationFrames,
    sharedDogId,
    sharedRole,
  ]);

  const dislikeAnimation = animated ? FadeInDown.delay(300) : undefined;
  const maybeAnimation = animated ? FadeInDown.delay(350) : undefined;
  const likeAnimation = animated ? FadeInDown.delay(400) : undefined;
  // Transition copies are visual-only and excluded from screen readers; the
  // real controls take over the instant the morph clears.
  const hiddenFromAccessibility = Boolean(visualOnly || hidden);

  return (
    <Container
      ref={containerRef}
      exiting={visualOnly ? undefined : ZoomOutDown}
      $hidden={!visualOnly && hidden}
      $inline={visualOnly}
      {...props}
      accessibilityElementsHidden={hiddenFromAccessibility}
      importantForAccessibility={
        hiddenFromAccessibility ? "no-hide-descendants" : "auto"
      }
      onLayout={measureSharedFrame}
    >
      <Animated.View entering={dislikeAnimation}>
        <ActionItem testID="swipe-dislike" onPress={onNope}>
          <ConfusedEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={maybeAnimation}>
        <ActionItem testID="swipe-maybe" onPress={onMaybe}>
          <ThinkingEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={likeAnimation}>
        <ActionItem testID="swipe-like" onPress={onYep}>
          <HeartEyesEmoji />
        </ActionItem>
      </Animated.View>
    </Container>
  );
};
