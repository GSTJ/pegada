import { useEffect, useState } from "react";
import { useSegments } from "expo-router";

import { getInitialRouteName } from "@/services/getInitialRouteName";

type InitialRoute = Awaited<ReturnType<typeof getInitialRouteName>>;

// https://docs.expo.dev/router/reference/authentication/
export const useProtectedRoute = (): {
  initialRouteName: InitialRoute | undefined;
} => {
  const segments = useSegments();

  const [initialRouteName, setInitialRouteName] = useState<InitialRoute>();

  const inAuthGroup = segments[0] === "(auth)";

  // Re-resolve at the auth boundary so a deep link cannot bypass the
  // authentication flow.
  useEffect(() => {
    let cancelled = false;

    // The previous route is no longer authoritative once the auth-group
    // boundary changes. Clear it immediately while the new state resolves so
    // authenticated-only integrations cannot remain enabled during logout.
    setInitialRouteName(undefined);

    const handleRouting = async () => {
      // It is safe to call this without a try/catch because the
      // `getInitialRouteName` function will always return a valid route name.
      const resolvedRouteName = await getInitialRouteName();

      if (!cancelled) {
        setInitialRouteName(resolvedRouteName);
      }
    };

    void handleRouting();

    return () => {
      cancelled = true;
    };
  }, [inAuthGroup]);

  return { initialRouteName };
};
