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

  useEffect(() => {
    const handleRouting = async () => {
      // It is safe to call this without a try/catch because the
      // `getInitialRouteName` function will always return a valid route name.
      const initialRouteName = await getInitialRouteName();

      setInitialRouteName(initialRouteName);
    };

    void handleRouting();

    // Makes sure the user cannot bypass the authentication flow
    // when entering via a deeplink
  }, [inAuthGroup]);

  return { initialRouteName };
};
