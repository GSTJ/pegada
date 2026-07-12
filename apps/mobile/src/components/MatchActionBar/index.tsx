import { useCallback, useEffect, useRef } from "react";
import * as React from "react";
import { View } from "react-native";
import Animated, { FadeInDown, ZoomOutDown } from "react-native-reanimated";

import {
  createHeroMeasurementLifecycle,
  registerHeroActionFrame,
  unregisterHeroSourceActionFrame,
  useIsHeroActive,
} from "@/components/HeroTransition/store";
import { ActionItem, ConfusedEmoji, Container, HeartEyesEmoji, ThinkingEmoji } from "./styles";

interface MatchActionBarProps extends React.ComponentProps<typeof Container> {
  onNope: () => void;
  onYep: () => void;
  onMaybe: () => void;
  animated?: boolean;
  sharedDogId?: string;
  sharedRole?: "source" | "target";
  visualOnly?: boolean;
}

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
  const pendingAnimationFrames = useRef(new Set<number>());
  const heroActive = useIsHeroActive(sharedDogId);
  const measureSharedFrame = useCallback(() => {
    if (!sharedDogId || !sharedRole) return;
    const generation = measurementLifecycle.current();
    if (generation === null) return;

    const animationFrame = requestAnimationFrame(() => {
      pendingAnimationFrames.current.delete(animationFrame);
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
    pendingAnimationFrames.current.add(animationFrame);
  }, [measurementLifecycle, sharedDogId, sharedRole]);

  useEffect(() => {
    const animationFrames = pendingAnimationFrames.current;
    measurementLifecycle.activate();
    measureSharedFrame();
    return () => {
      // Invalidate first: even a native callback already beyond the RAF
      // cannot publish after this component/id stops owning the frame.
      measurementLifecycle.invalidate();
      for (const animationFrame of animationFrames) {
        cancelAnimationFrame(animationFrame);
      }
      animationFrames.clear();
      if (sharedDogId && sharedRole === "source") {
        unregisterHeroSourceActionFrame(sharedDogId);
      }
    };
  }, [measureSharedFrame, measurementLifecycle, sharedDogId, sharedRole]);

  const dislikeAnimation = animated ? FadeInDown.delay(300) : undefined;
  const maybeAnimation = animated ? FadeInDown.delay(350) : undefined;
  const likeAnimation = animated ? FadeInDown.delay(400) : undefined;
  const hiddenFromAccessibility = Boolean(visualOnly || heroActive);

  return (
    <Container
      ref={containerRef}
      exiting={visualOnly ? undefined : ZoomOutDown}
      $hidden={visualOnly ? false : heroActive}
      $inline={visualOnly}
      {...props}
      accessibilityElementsHidden={hiddenFromAccessibility}
      importantForAccessibility={hiddenFromAccessibility ? "no-hide-descendants" : "auto"}
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
