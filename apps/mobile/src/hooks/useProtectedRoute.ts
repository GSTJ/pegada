import { useEffect, useState } from "react";
import { useSegments } from "expo-router";

import { getInitialRouteName } from "@/services/getInitialRouteName";
import { SceneName } from "@/types/SceneName";

type InitialRoute = Awaited<ReturnType<typeof getInitialRouteName>>;
type RoutingState = {
  initialRouteName: InitialRoute;
  shouldReplaceInitialRoute: boolean;
};

// https://docs.expo.dev/router/reference/authentication/
export const useProtectedRoute = (): {
  initialRouteName: InitialRoute | undefined;
  shouldReplaceInitialRoute: boolean;
} => {
  const segments = useSegments();

  const [routingState, setRoutingState] = useState<RoutingState>();

  const inAuthGroup = segments[0] === "(auth)";
  const inAppGroup = segments[0] === "(app)";

  useEffect(() => {
    let isCurrentCheck = true;

    // The previous result stops being authoritative at a route-group
    // boundary. Clearing it prevents authenticated-only system integrations
    // from remaining enabled while logout or onboarding is being resolved.
    setRoutingState(undefined);

    const handleRouting = async () => {
      // It is safe to call this without a try/catch because the
      // `getInitialRouteName` function will always return a valid route name.
      const initialRouteName = await getInitialRouteName();

      if (!isCurrentCheck) return;

      // SceneName.Swipe is the successful result after authentication,
      // profile, location and force-update checks. At that point an app route
      // already resolved by Expo Router can be kept. This preserves cold-start
      // deep links such as /messages without letting them bypass the guard.
      setRoutingState({
        initialRouteName,
        shouldReplaceInitialRoute: initialRouteName !== SceneName.Swipe || !inAppGroup,
      });
    };

    void handleRouting();

    // Makes sure the user cannot bypass the authentication flow
    // when entering via a deeplink
    return () => {
      // A deep link can resolve while the async guard is still checking the
      // index route. Ignore that stale result and rerun against the new group.
      isCurrentCheck = false;
    };
  }, [inAppGroup, inAuthGroup]);

  return {
    initialRouteName: routingState?.initialRouteName,
    shouldReplaceInitialRoute: routingState?.shouldReplaceInitialRoute ?? false,
  };
};
