import { useEffect, useRef } from "react";

export const useIsFirstRender = (): boolean => {
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    isFirstRenderRef.current = false;
  }, []);

  return isFirstRenderRef.current;
};
