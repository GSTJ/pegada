import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";

import { analytics } from "@/services/analytics";

export const useTrackScreens = () => {
  const routeNameRef = useRef<string | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    // PostHog records the screen change (with referringScreen) as the
    // navigation trail; it also threads onto captured exceptions.
    analytics.screenViewed({
      screen: pathname,
      referringScreen: routeNameRef.current,
    });

    routeNameRef.current = pathname;
  }, [pathname]);
};
