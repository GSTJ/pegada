import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDefaultHeaderHeight, useHeaderHeight } from "@react-navigation/elements";

/**
 * This fixes a bug where the header height is not calculated correctly
 * on first render. So we use this to delay the header height calculation.
 * Let's remove this when the bug is fixed.
 */
export const useDelayedHeaderHeight = () => {
  const layout = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = useHeaderHeight();
  const defaultHeight = getDefaultHeaderHeight(layout, false, insets.top);
  const [delayedHeight, setDelayedHeight] = useState(defaultHeight);

  useEffect(() => {
    // Do not expose a zero/stale frame while native-stack finishes measuring.
    // This is the same fallback React Navigation uses for a regular header.
    setDelayedHeight(defaultHeight);

    const timeout = setTimeout(() => {
      setDelayedHeight(height);
    }, 100); // Could be as low as 10ms, but let's put it at 100 to be safe

    return () => {
      clearTimeout(timeout);
    };
  }, [defaultHeight, height]);

  return delayedHeight;
};
