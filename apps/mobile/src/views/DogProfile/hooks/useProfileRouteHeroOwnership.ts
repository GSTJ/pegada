import { useCallback, useLayoutEffect, useRef } from "react";

import {
  getHeroOwnedForwardRunId,
  releaseHeroRouteOwnership,
  type HeroSourceKind,
} from "@/components/HeroTransition/store";

interface UseProfileRouteHeroOwnershipProps {
  heroPhotoSessionToken?: string;
  id: string;
  isFocused: boolean;
  sourceKind: HeroSourceKind;
  usesHeroScene: boolean;
}

export const useProfileRouteHeroOwnership = ({
  heroPhotoSessionToken,
  id,
  isFocused,
  sourceKind,
  usesHeroScene,
}: UseProfileRouteHeroOwnershipProps) => {
  const capturedRef = useRef(isFocused);
  const forwardRunIdRef = useRef<number | null>(
    isFocused && usesHeroScene ? getHeroOwnedForwardRunId({ id, sourceKind }) : null,
  );

  useLayoutEffect(() => {
    if (capturedRef.current || !isFocused) return;
    capturedRef.current = true;
    if (!usesHeroScene) return;
    forwardRunIdRef.current = getHeroOwnedForwardRunId({ id, sourceKind });
  }, [id, isFocused, sourceKind, usesHeroScene]);

  const getForwardRunId = useCallback(() => forwardRunIdRef.current, []);
  const hasExactOwnership = useCallback(() => {
    const forwardRunId = forwardRunIdRef.current;
    return forwardRunId !== null && getHeroOwnedForwardRunId({ id, sourceKind }) === forwardRunId;
  }, [id, sourceKind]);
  const release = useCallback(
    () =>
      releaseHeroRouteOwnership({
        id,
        sourceKind,
        forwardRunId: forwardRunIdRef.current,
        ...(sourceKind === "swipe" ? { photoSessionToken: heroPhotoSessionToken } : {}),
      }),
    [heroPhotoSessionToken, id, sourceKind],
  );

  return { getForwardRunId, hasExactOwnership, release };
};
