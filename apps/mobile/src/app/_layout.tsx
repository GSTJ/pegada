import "@/config";

import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MagicModalPortal } from "react-native-magic-modal";
import { router, SplashScreen, Stack } from "expo-router";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Provider } from "react-redux";
import styled from "styled-components/native";

import { NetworkBoundary } from "@/components/NetworkBoundary";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { TRPCProvider } from "@/contexts/TRPCProvider";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useTrackScreens } from "@/hooks/useTrackScreens";
import { sendError } from "@/services/errorTracking";
import { useGetInitialNotifications } from "@/services/linking";
import { store } from "@/store";

// Wait for the assets to load before hiding the SplashScreen
SplashScreen.preventAutoHideAsync()?.catch(sendError);

const AppContainer = styled(GestureHandlerRootView)`
  flex: 1;
`;

const App = () => {
  const { initialRouteName } = useProtectedRoute();

  useEffect(() => {
    if (initialRouteName) {
      SplashScreen.hideAsync()?.catch(sendError);
      router.replace(initialRouteName);
    }
  }, [initialRouteName]);

  useTrackScreens();
  useGetInitialNotifications();

  return (
    <AppContainer>
      <TRPCProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <NetworkBoundary>
              <Provider store={store}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(app)" />
                  <Stack.Screen name="(auth)" />
                </Stack>
              </Provider>
              <MagicModalPortal />
            </NetworkBoundary>
          </BottomSheetModalProvider>
        </ThemeProvider>
      </TRPCProvider>
    </AppContainer>
  );
};

export default App;
