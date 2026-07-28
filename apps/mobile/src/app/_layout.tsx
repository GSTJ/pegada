import "@/config";
import { useEffect, useState } from "react";

import { router, SplashScreen, Stack } from "expo-router";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { magicModal, MagicModalPortal } from "react-native-magic-modal";
import { Provider } from "react-redux";
import styled from "styled-components/native";

import { NetworkBoundary } from "@/components/NetworkBoundary";
import { storedThemePromise, ThemeProvider } from "@/contexts/theme-provider";
import { TRPCProvider } from "@/contexts/trpc-provider";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { useTrackScreens } from "@/hooks/use-track-screens";
import { config } from "@/services/config";
import { sendError } from "@/services/error-tracking";
import { useGetInitialNotifications } from "@/services/linking";
import { getExpoPostHog } from "@/services/observability";
import { useQuickActions } from "@/services/quickActions";
import { store } from "@/store";
import { SceneName } from "@/types/scene-name";

// Wait for the assets to load before hiding the SplashScreen
SplashScreen.preventAutoHideAsync()?.catch(sendError);

const AppContainer = styled(GestureHandlerRootView)`
  flex: 1;
`;

const App = () => {
  const { initialRouteName } = useProtectedRoute();
  const [themeReady, setThemeReady] = useState(false);

  // Keep the native splash up until the stored theme override has been
  // applied (ThemeProvider awaits the same promise and its effect runs
  // first). Hiding earlier paints the system theme for a frame and then
  // flips to the stored one — the white/dark blink at boot in dark mode.
  useEffect(() => {
    void storedThemePromise.finally(() => setThemeReady(true));
  }, []);

  useEffect(() => {
    if (initialRouteName && themeReady) {
      SplashScreen.hideAsync()?.catch(sendError);
      router.replace(initialRouteName);
    }
  }, [initialRouteName, themeReady]);

  useTrackScreens();
  useGetInitialNotifications();
  // Quick actions can be triggered from this unauthenticated-safe root
  // mount, so navigation is gated on having resolved to the fully
  // authenticated, onboarded route -- see `useQuickActions`'s docblock.
  useQuickActions(initialRouteName === SceneName.Swipe);

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

  const tree = (
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
  );

  // `getExpoPostHog()` is null in a build with no key, and PostHogProvider
  // cannot be handed one — mounting it with an uninitialised client leaves
  // every `usePostHog()` consumer queueing events into a socket that never
  // opens. Rendering the app without the provider is the documented shape;
  // the error boundary inside NetworkBoundary reports through the shared
  // client either way, which no-ops just as silently.
  const posthog = getExpoPostHog();
  if (!posthog) return <AppContainer>{tree}</AppContainer>;

  return (
    <AppContainer>
      <PostHogProvider client={posthog} autocapture={false}>
        {tree}
      </PostHogProvider>
    </AppContainer>
  );
};

export default App;
