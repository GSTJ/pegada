import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import Bugsnag from "@bugsnag/expo";

import { analytics } from "@/services/analytics";

export const useTrackScreens = () => {
  const routeNameRef = useRef<string>();
  const pathname = usePathname();

  useEffect(() => {
    analytics.screenViewed({
      screen: pathname,
      referringScreen: routeNameRef.current
    });

    // https://github.com/bugsnag/bugsnag-js/blob/next/packages/plugin-react-navigation/react-navigation.js
    Bugsnag.leaveBreadcrumb(
      "Navigation State Change",
      { to: pathname, from: routeNameRef.current },
      "navigation"
    );

    routeNameRef.current = pathname;
  }, [pathname]);
};
