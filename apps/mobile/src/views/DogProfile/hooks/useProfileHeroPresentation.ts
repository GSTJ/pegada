import { useEffect, useRef } from "react";
import {
  cancelAnimation,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { HeroState } from "@/components/HeroTransition/store";

interface UseProfileHeroPresentationProps {
  activeHero: HeroState;
  heroProgress: SharedValue<number>;
  id: string;
  matchingHeroActive: boolean;
  recovery: SharedValue<number>;
}

export const useProfileHeroPresentation = ({
  activeHero,
  heroProgress,
  id,
  matchingHeroActive,
  recovery,
}: UseProfileHeroPresentationProps) => {
  const descriptionOpacity = useSharedValue(1);
  const revealDescriptionAfterForward = useRef(false);
  const forwardTargetRecovery = Boolean(
    activeHero.id === id &&
    activeHero.phase === "forward" &&
    activeHero.forwardFallback === "target" &&
    activeHero.title,
  );
  const targetRecoveryStyle = useAnimatedStyle(() => {
    if (!forwardTargetRecovery) return {};
    return { opacity: recovery.value };
  }, [forwardTargetRecovery]);

  useEffect(() => {
    const matchingForwardBio = Boolean(
      matchingHeroActive && activeHero.phase === "forward" && activeHero.sourceBio,
    );
    if (matchingForwardBio) {
      revealDescriptionAfterForward.current = true;
      cancelAnimation(descriptionOpacity);
      descriptionOpacity.value = 0;
      return;
    }
    if (matchingHeroActive || !revealDescriptionAfterForward.current) return;

    revealDescriptionAfterForward.current = false;
    cancelAnimation(descriptionOpacity);
    descriptionOpacity.value = withTiming(1, { duration: 140 });
  }, [activeHero.phase, activeHero.sourceBio, descriptionOpacity, matchingHeroActive]);

  const profileDescriptionHeroStyle = useAnimatedStyle(() => {
    const realOverlayReverse = Boolean(
      matchingHeroActive &&
      activeHero.sourceBio &&
      activeHero.phase === "reverse" &&
      activeHero.reverseFallback !== "scene",
    );
    if (!realOverlayReverse) return { opacity: descriptionOpacity.value };

    return {
      opacity:
        descriptionOpacity.value *
        interpolate(heroProgress.value, [0, 0.08], [1, 0], Extrapolation.CLAMP),
    };
  }, [
    activeHero.phase,
    activeHero.reverseFallback,
    activeHero.sourceBio,
    descriptionOpacity,
    matchingHeroActive,
  ]);

  const goBackComplementRecovery = Boolean(
    activeHero.id === id &&
    activeHero.phase === "forward" &&
    activeHero.forwardFallback === "target" &&
    activeHero.forwardGoBackRecoveryMode === "complement",
  );
  const goBackRecoveryStyle = useAnimatedStyle(() => {
    if (!goBackComplementRecovery) return {};
    return { opacity: recovery.value };
  }, [goBackComplementRecovery]);

  return { goBackRecoveryStyle, profileDescriptionHeroStyle, targetRecoveryStyle };
};
