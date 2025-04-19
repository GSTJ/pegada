import { useEffect, useState } from "react";
import { useHeaderHeight } from "@react-navigation/elements";

/**
 * This fixes a bug where the header height is not calculated correctly
 * on first render. So we use this to delay the header height calculation.
 * Let's remove this when the bug is fixed.
 */
export const useDelayedHeaderHeight = () => {
  const [delayedHeight, setDelayedHeight] = useState(0);
  const height = useHeaderHeight();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDelayedHeight(height);
    }, 100); // Could be as low as 10ms, but let's put it at 100 to be safe

    return () => {
      clearTimeout(timeout);
    };
  }, [height]);

  return delayedHeight;
};
