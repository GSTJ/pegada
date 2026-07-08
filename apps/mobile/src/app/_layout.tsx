import "@/config";

import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { magicModal, MagicModalPortal } from "react-native-magic-modal";
import { PostHogProvider } from "posthog-react-native";
import { router, SplashScreen, Stack } from "expo-router";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Provider } from "react-redux";
import styled from "styled-components/native";

import { NetworkBoundary } from "@/components/NetworkBoundary";
import { config } from "@/services/config";
import { posthog } from "@/services/posthog";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { TRPCProvider } from "@/contexts/TRPCProvider";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useTrackScreens } from "@/hooks/useTrackScreens";
import { sendError } from "@/services/errorTracking";
import { useGetInitialNotifications } from "@/services/linking";
import { useQuickActions } from "@/services/quickActions";
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
  useQuickActions();

  // MAESTRO_E2E only: render magic modals inside the main window instead
  // of RNScreens' FullWindowOverlay. The overlay is a separate native
  // UIWindow, and its mere presence makes XCUITest (Maestro, mobile-mcp)
  // snapshot THAT window — the entire app becomes invisible to the
  // accessibility tree: no testIDs, no text, nothing. Verified A/B on
  // iPhone 17 Pro Max iOS 26 (2026-07-02): with the overlay mounted,
  // `maestro hierarchy` shows only keyboard + status bar; without it,
  // testIDs surface and semantic selectors work.
  //
  // Gated to e2e builds because location-map and upgrade-wall use native
  // `presentation: "modal"`, and a main-window magic toast would layer
  // BEHIND them for real users. The production-grade fix is upstream in
  // react-native-magic-modal: only mount FullWindowOverlay while a modal
  // is actually open.
  useEffect(() => {
    if (config.MAESTRO_E2E === "1") {
      magicModal.disableFullWindowOverlay();
    }
  }, []);

  return (
    <AppContainer>
      <PostHogProvider client={posthog} autocapture={false}>
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
      </PostHogProvider>
    </AppContainer>
  );
};

export default App;
