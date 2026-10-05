import { useCallback, useEffect, useRef, useState } from "react";

export const useProfileReverseRemoval = () => {
  const [sceneRemoving, setSceneRemoving] = useState(false);
  const [removalCommit, setRemovalCommit] = useState(0);
  const pendingRemovalRef = useRef<(() => void) | null>(null);
  const removalFrameRef = useRef<number | null>(null);
  const allowAndroidRemovalRef = useRef(false);

  const deferRemoval = useCallback((removeRoute: () => void) => {
    pendingRemovalRef.current = removeRoute;
    setSceneRemoving(true);
    setRemovalCommit((revision) => revision + 1);
  }, []);
  const markSceneRemoving = useCallback(() => setSceneRemoving(true), []);

  useEffect(() => {
    if (removalCommit === 0) return;
    const removeRoute = pendingRemovalRef.current;
    if (!removeRoute || removalFrameRef.current !== null) return;

    const frame = requestAnimationFrame(() => {
      if (removalFrameRef.current !== frame) return;
      removalFrameRef.current = null;
      if (pendingRemovalRef.current !== removeRoute) return;
      pendingRemovalRef.current = null;
      removeRoute();
    });
    removalFrameRef.current = frame;

    return () => {
      if (removalFrameRef.current !== frame) return;
      cancelAnimationFrame(frame);
      removalFrameRef.current = null;
    };
  }, [removalCommit]);

  useEffect(
    () => () => {
      if (removalFrameRef.current !== null) cancelAnimationFrame(removalFrameRef.current);
      removalFrameRef.current = null;
      pendingRemovalRef.current = null;
    },
    [],
  );

  return {
    allowAndroidRemovalRef,
    deferRemoval,
    markSceneRemoving,
    sceneRemoving,
  };
};
