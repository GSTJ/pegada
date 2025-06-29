import { useEffect, useRef } from "react";

export const useIsFirstRenderRef = () => {
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    isFirstRenderRef.current = false;
  }, []);

  return isFirstRenderRef;
};
