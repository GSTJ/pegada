import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";

import {
  acknowledgeHeroTargetFrame,
  registerHeroTargetFrame,
  shouldHideHeroEndpointPhoto,
  type HeroState,
} from "@/components/HeroTransition/store";
import type { GoBackRef } from "@/views/DogProfile/components/GoBack";

export const useProfileHeroTargets = (id: string, activeHero: HeroState) => {
  const titleAnchorRef = useRef<View>(null);
  const goBackRef = useRef<GoBackRef>(null);
  const titleRunId =
    activeHero.id === id && activeHero.phase === "forward" && activeHero.title
      ? activeHero.runId
      : 0;
  const goBackRunId = activeHero.id === id && activeHero.phase === "forward" ? activeHero.runId : 0;
  const hideSharedSurface = shouldHideHeroEndpointPhoto(activeHero, id, false);

  const publishFrame = useCallback(
    (
      role: "goBack" | "title",
      runId: number,
      frame: Parameters<typeof registerHeroTargetFrame>[0]["frame"],
    ) => {
      const args = { id, runId, role, frame } as const;
      if (activeHero.handoffPending) acknowledgeHeroTargetFrame(args);
      else registerHeroTargetFrame(args);
    },
    [activeHero.handoffPending, id],
  );

  const onTitleLayout = useCallback(() => {
    if (!titleRunId) return;
    requestAnimationFrame(() => {
      titleAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) return;
        publishFrame("title", titleRunId, { x, y, width, height });
      });
    });
  }, [publishFrame, titleRunId]);

  const onGoBackLayout = useCallback(() => {
    if (!goBackRunId) return;
    requestAnimationFrame(() => {
      goBackRef.current?.measureInWindow((x, y, width, height) => {
        if (width <= 0 || height <= 0) return;
        publishFrame("goBack", goBackRunId, { x, y, width, height });
      });
    });
  }, [goBackRunId, publishFrame]);

  useEffect(() => {
    if (!activeHero.handoffPending || activeHero.phase !== "forward") return;
    onTitleLayout();
    onGoBackLayout();
  }, [activeHero.handoffPending, activeHero.phase, onGoBackLayout, onTitleLayout]);

  return {
    goBackRef,
    hideProfileSharedSurface: hideSharedSurface,
    hideProfileTitle: hideSharedSurface && Boolean(activeHero.title),
    hideRealGoBack: hideSharedSurface,
    onGoBackLayout,
    onTitleLayout,
    titleAnchorRef,
  };
};
