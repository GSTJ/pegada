import { useCallback, useEffect, useRef, useState } from "react";
import {
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { HERO_MORPH_DURATION } from "@/components/HeroTransition/motion";
import {
  cancelHeroSourceOpening,
  completeReverseSceneFallback,
  type HeroState,
} from "@/components/HeroTransition/store";

interface UseProfileScenePresentationProps {
  activeHero: HeroState;
  heroProgress: SharedValue<number>;
  id: string;
  matchingHeroActive: boolean;
  onReverseFallbackComplete: () => void;
  reverseSceneRemoving: boolean;
  usesHeroScene: boolean;
}

export const useProfileScenePresentation = ({
  activeHero,
  heroProgress,
  id,
  matchingHeroActive,
  onReverseFallbackComplete,
  reverseSceneRemoving,
  usesHeroScene,
}: UseProfileScenePresentationProps) => {
  const [sceneSettled, setSceneSettled] = useState(!usesHeroScene);
  const sceneFallbackGeneration = useRef(0);
  const reverseFallbackRunId = useRef(0);
  const holdsCompletedReverseScene =
    reverseSceneRemoving || (!matchingHeroActive && reverseFallbackRunId.current !== 0);

  const finishSceneFallback = useCallback((generation: number) => {
    if (sceneFallbackGeneration.current !== generation) return;
    setSceneSettled(true);
  }, []);
  const finishReverseFallback = useCallback(
    (runId: number) => {
      onReverseFallbackComplete();
      completeReverseSceneFallback(runId);
    },
    [onReverseFallbackComplete],
  );

  useEffect(() => {
    if (
      activeHero.id !== id ||
      activeHero.phase !== "reverse" ||
      activeHero.reverseFallback !== "scene" ||
      reverseFallbackRunId.current === activeHero.runId
    ) {
      return;
    }
    const runId = activeHero.runId;
    reverseFallbackRunId.current = runId;
    heroProgress.value = 0;
    heroProgress.value = withTiming(1, { duration: HERO_MORPH_DURATION }, (finished) => {
      if (finished) runOnJS(finishReverseFallback)(runId);
    });
  }, [
    activeHero.id,
    activeHero.phase,
    activeHero.reverseFallback,
    activeHero.runId,
    finishReverseFallback,
    heroProgress,
    id,
  ]);

  useEffect(() => {
    if (!usesHeroScene) {
      setSceneSettled(true);
      return;
    }
    if (matchingHeroActive) {
      sceneFallbackGeneration.current += 1;
      if (activeHero.phase === "forward") setSceneSettled(false);
      return;
    }
    if (sceneSettled) return;

    const generation = ++sceneFallbackGeneration.current;
    const remainingProgress = Math.max(0, Math.min(1, 1 - heroProgress.value));
    heroProgress.value = withTiming(
      1,
      { duration: HERO_MORPH_DURATION * remainingProgress },
      (finished) => {
        if (finished) runOnJS(finishSceneFallback)(generation);
      },
    );
  }, [
    activeHero.phase,
    finishSceneFallback,
    heroProgress,
    matchingHeroActive,
    sceneSettled,
    usesHeroScene,
  ]);

  useEffect(() => {
    if (!usesHeroScene || matchingHeroActive || !sceneSettled) return;
    // A settled destination is a second terminal lifecycle boundary for the
    // source-opening owner. It cannot be a legitimate deck measurement while
    // this profile owns the foreground, and leaving it alive disables the
    // profile pager/action bar even though the visual morph has landed.
    cancelHeroSourceOpening(id);
  }, [id, matchingHeroActive, sceneSettled, usesHeroScene]);

  const sceneStyle = useAnimatedStyle(() => {
    if (!usesHeroScene) return { opacity: 1 };
    if (holdsCompletedReverseScene) return { opacity: 0 };
    if (matchingHeroActive) {
      return {
        opacity: activeHero.phase === "reverse" ? 1 - heroProgress.value : heroProgress.value,
      };
    }
    return { opacity: sceneSettled ? 1 : heroProgress.value };
  }, [
    activeHero.phase,
    holdsCompletedReverseScene,
    matchingHeroActive,
    sceneSettled,
    usesHeroScene,
  ]);

  const [fallbackPastMidpoint, setFallbackPastMidpoint] = useState(false);
  useAnimatedReaction(
    () => heroProgress.value >= 0.5,
    (next, previous) => {
      if (next !== previous) runOnJS(setFallbackPastMidpoint)(next);
    },
    [activeHero.runId],
  );

  return { fallbackPastMidpoint, holdsCompletedReverseScene, sceneSettled, sceneStyle };
};
