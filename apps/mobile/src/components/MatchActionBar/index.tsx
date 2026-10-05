import { useCallback, useEffect, useRef } from "react";
import * as React from "react";
import { View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, ZoomOutDown } from "react-native-reanimated";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import {
  acknowledgeHeroTargetFrame,
  acknowledgeHeroSourceFrame,
  createHeroMeasurementLifecycle,
  isHeroSourceSurfaceHeld,
  isSwipeSurfaceHeroLocked,
  markHeroSourceFocused,
  refreshSettledHeroActionFrame,
  registerHeroActionFrame,
  registerHeroTargetFrame,
  shouldHideHeroEndpointPhoto,
  unregisterHeroSourceActionFrame,
  useHeroState,
  useIsHeroSourceOpening,
  useIsSwipeSurfaceHeroLocked,
} from "@/components/HeroTransition/store";
import { useHeroRecoveryProgress } from "@/components/HeroTransition/motion";
import { getIsSwipeActionInFlight, useIsSwipeActionInFlight } from "@/store/swipeActionFlight";
import { ActionItem, ConfusedEmoji, Container, HeartEyesEmoji, ThinkingEmoji } from "./styles";

const SourceHandoffAcknowledgement = ({
  id,
  containerRef,
}: {
  id: string;
  containerRef: React.RefObject<View | null>;
}) => {
  const activeHero = useHeroState();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (
      !isFocused ||
      activeHero.id !== id ||
      activeHero.phase !== "reverse" ||
      !activeHero.handoffPending
    ) {
      return;
    }

    const runId = activeHero.runId;
    let cancelled = false;
    markHeroSourceFocused({ id, runId });
    const animationFrame = requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        acknowledgeHeroSourceFrame({
          id,
          runId,
          role: "action",
          frame: { x, y, width, height },
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [activeHero, containerRef, id, isFocused]);

  return null;
};

const TargetHandoffAcknowledgement = ({
  id,
  containerRef,
}: {
  id: string;
  containerRef: React.RefObject<View | null>;
}) => {
  const activeHero = useHeroState();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (
      !isFocused ||
      activeHero.id !== id ||
      activeHero.phase !== "forward" ||
      !activeHero.handoffPending ||
      !activeHero.actionFrom
    ) {
      return;
    }

    const runId = activeHero.runId;
    let cancelled = false;
    const animationFrame = requestAnimationFrame(() => {
      containerRef.current?.measureInWindow((x, y, width, height) => {
        if (cancelled || width <= 0 || height <= 0) return;
        acknowledgeHeroTargetFrame({
          id,
          runId,
          role: "action",
          frame: { x, y, width, height },
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [activeHero, containerRef, id, isFocused]);

  return null;
};

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
  style,
  ...props
}) => {
  const containerRef = useRef<View>(null);
  const measurementLifecycle = useRef(createHeroMeasurementLifecycle()).current;
  const pendingAnimationFrames = useRef(new Set<number>());
  const activeHero = useHeroState();
  const targetForwardRunId = useRef<number | null>(null);
  const activeTargetRunId =
    sharedRole === "target" &&
    sharedDogId &&
    activeHero.id === sharedDogId &&
    activeHero.phase === "forward"
      ? activeHero.runId
      : null;
  if (activeTargetRunId !== null) targetForwardRunId.current = activeTargetRunId;
  const recovery = useHeroRecoveryProgress();
  const handoffRecovery = Boolean(
    sharedDogId &&
    activeHero.id === sharedDogId &&
    ((sharedRole === "target" &&
      activeHero.phase === "forward" &&
      activeHero.forwardFallback === "target") ||
      (sharedRole === "source" &&
        activeHero.phase === "reverse" &&
        activeHero.reverseFallback === "handoff")),
  );
  const recoveryStyle = useAnimatedStyle(() => {
    if (!handoffRecovery) return {};
    return { opacity: recovery.value };
  }, [handoffRecovery]);
  const overlayOwnsAction = Boolean(
    sharedDogId &&
    sharedRole &&
    activeHero.actionFrom &&
    shouldHideHeroEndpointPhoto(activeHero, sharedDogId, sharedRole === "source", "swipe"),
  );
  const sourceSurfaceHeld = Boolean(
    sharedRole === "source" && isHeroSourceSurfaceHeld(activeHero, sharedDogId, "swipe"),
  );
  const heroOwnsSurface = overlayOwnsAction || sourceSurfaceHeld;
  const targetHeroOwnsExit = Boolean(
    sharedRole === "target" &&
    sharedDogId &&
    activeHero.id === sharedDogId &&
    activeHero.phase !== null &&
    activeHero.actionFrom,
  );
  const heroSourceOpening = useIsHeroSourceOpening(sharedDogId);
  const sourceOpening = sharedRole === "source" && heroSourceOpening;
  const swipeHeroLocked = useIsSwipeSurfaceHeroLocked();
  const swipeActionInFlight = useIsSwipeActionInFlight();
  const interactionLocked =
    sourceOpening || heroOwnsSurface || swipeHeroLocked || swipeActionInFlight;
  const { t } = useTranslation();
  const measureSharedFrame = useCallback(() => {
    if (!sharedDogId || !sharedRole) return;
    // Capture the owner before crossing either async boundary. Reading the
    // mutable ref inside the native callback would let an old same-dog
    // measurement masquerade as a replacement run.
    const rememberedTargetRunId = targetForwardRunId.current;
    const targetMeasurement =
      sharedRole !== "target"
        ? null
        : activeTargetRunId !== null
          ? { kind: "active" as const, runId: activeTargetRunId }
          : activeHero.phase === null && rememberedTargetRunId !== null
            ? { kind: "settled" as const, runId: rememberedTargetRunId }
            : null;
    const generation = measurementLifecycle.current();
    if (generation === null) return;

    const animationFrame = requestAnimationFrame(() => {
      pendingAnimationFrames.current.delete(animationFrame);
      if (!measurementLifecycle.isCurrent(generation)) return;

      containerRef.current?.measureInWindow((x, y, width, height) => {
        if (!measurementLifecycle.isCurrent(generation)) return;
        if (width > 0 && height > 0) {
          const frame = { x, y, width, height };
          if (sharedRole === "target") {
            if (targetMeasurement?.kind === "active") {
              registerHeroTargetFrame({
                id: sharedDogId,
                runId: targetMeasurement.runId,
                role: "action",
                frame,
              });
            } else if (targetMeasurement?.kind === "settled") {
              refreshSettledHeroActionFrame({
                id: sharedDogId,
                forwardRunId: targetMeasurement.runId,
                frame,
              });
            }
          } else {
            registerHeroActionFrame({ id: sharedDogId, role: "source", frame });
          }
        }
      });
    });
    pendingAnimationFrames.current.add(animationFrame);
  }, [activeHero.phase, activeTargetRunId, measurementLifecycle, sharedDogId, sharedRole]);

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
  const hiddenFromAccessibility = Boolean(visualOnly || interactionLocked);

  const runIfSwipeIdle = (callback: () => void) => () => {
    if (getIsSwipeActionInFlight() || isSwipeSurfaceHeroLocked()) return;
    callback();
  };

  return (
    <Container
      ref={containerRef}
      exiting={visualOnly || targetHeroOwnsExit ? undefined : ZoomOutDown}
      $hidden={visualOnly ? false : heroOwnsSurface}
      $inline={visualOnly}
      $interactionLocked={interactionLocked}
      {...props}
      style={[style, recoveryStyle]}
      accessibilityElementsHidden={hiddenFromAccessibility}
      importantForAccessibility={hiddenFromAccessibility ? "no-hide-descendants" : "auto"}
      onLayout={measureSharedFrame}
    >
      {sharedRole === "source" && sharedDogId ? (
        <SourceHandoffAcknowledgement id={sharedDogId} containerRef={containerRef} />
      ) : null}
      {sharedRole === "target" && sharedDogId ? (
        <TargetHandoffAcknowledgement id={sharedDogId} containerRef={containerRef} />
      ) : null}
      <Animated.View entering={dislikeAnimation}>
        <ActionItem
          testID="swipe-dislike"
          accessibilityRole="button"
          accessibilityLabel={t("swipeActions.pass")}
          onPress={runIfSwipeIdle(onNope)}
        >
          <ConfusedEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={maybeAnimation}>
        <ActionItem
          testID="swipe-maybe"
          accessibilityRole="button"
          accessibilityLabel={t("swipeActions.maybe")}
          onPress={runIfSwipeIdle(onMaybe)}
        >
          <ThinkingEmoji />
        </ActionItem>
      </Animated.View>
      <Animated.View entering={likeAnimation}>
        <ActionItem
          testID="swipe-like"
          accessibilityRole="button"
          accessibilityLabel={t("swipeActions.like")}
          onPress={runIfSwipeIdle(onYep)}
        >
          <HeartEyesEmoji />
        </ActionItem>
      </Animated.View>
    </Container>
  );
};
