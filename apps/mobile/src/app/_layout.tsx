import { useEffect, useState } from "react";

import "@/config";
import { router, SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { PostHogProvider } from "posthog-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { magicModal, MagicModalPortal } from "react-native-magic-modal";
import {
  StyleSheet,
  useUnistyles,
  withUnistyles,
} from "react-native-unistyles";
import { Provider } from "react-redux";

import { NetworkBoundary } from "@/components/NetworkBoundary";
import { storedThemePromise, ThemeProvider } from "@/contexts/theme-provider";
import { TRPCProvider } from "@/contexts/trpc-provider";
import { useProtectedRoute } from "@/hooks/use-protected-route";
import { useTrackScreens } from "@/hooks/use-track-screens";
import { config } from "@/services/config";
import { sendError } from "@/services/error-tracking";
import { useForceUpdateOnForeground } from "@/services/force-update";
import { useGetInitialNotifications } from "@/services/linking";
import { getExpoPostHog } from "@/services/observability";
import { useQuickActions } from "@/services/quick-actions";
import { useCaptureReferral } from "@/services/referral";
import { store } from "@/store";
import { SceneName } from "@/types/scene-name";

// Wait for the assets to load before hiding the SplashScreen
SplashScreen.preventAutoHideAsync()?.catch(sendError);
/**
 * The bottom of React Native's status-bar props stack.
 *
 * Screens topped by a full-bleed photo (Profile, dog profile, new match) push
 * `style="light"` on top of this. When they unmount, RN pops their entry and
 * falls back to whatever is left — and with nothing underneath, that is its
 * own `_defaultProps.barStyle`, which is `"default"`. On iOS "default" means
 * "let UIKit decide" and resolves correctly. On Android, RN's StatusBarModule
 * maps anything that is not exactly `"dark-content"` to
 * `setSystemBarsAppearance(0, APPEARANCE_LIGHT_STATUS_BARS)` — it CLEARS the
 * light-status-bar appearance, i.e. white icons. So one visit to the Profile
 * tab left every light screen after it with an entirely blank status bar: no
 * clock, no battery, no signal.
 *
 * Mounted once, above the router, so there is always an entry to fall back to.
 * `style` is resolved off the app's own theme rather than `"auto"`, which
 * follows the *system* colour scheme and would be wrong the moment the user
 * forces light or dark in Preferences.
 */
const ThemedStatusBar = () => {
  const { theme } = useUnistyles();

  return <StatusBar style={theme.dark ? "light" : "dark"} />;
};

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
  // The launch check only ever runs once. This is the same check on the way
  // back from the background, for the phones that go weeks without a cold
  // start and would otherwise never see a raised floor.
  useForceUpdateOnForeground();
  // Ahead of the auth gate on purpose: the link that carries a referral is
  // usually opened by someone with no account, and the referral has to be on
  // disk before they reach the sign in screen.
  useCaptureReferral();
  // Wait for authentication and onboarding before following a shortcut.
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
        <>
          {/*
            Ahead of the router, so its entry sits at the BOTTOM of React
            Native's status-bar props stack and a screen that pops its own
            `style="light"` falls back to the theme instead of to RN's
            `"default"`.
          */}
          <ThemedStatusBar />
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
        </>
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
  if (!posthog)
    return <AppContainer style={styles.appContainer}>{tree}</AppContainer>;

  return (
    <AppContainer style={styles.appContainer}>
      <PostHogProvider client={posthog} autocapture={false}>
        {tree}
      </PostHogProvider>
    </AppContainer>
  );
};

export default App;

const styles = StyleSheet.create({
  appContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
});

const AppContainer = withUnistyles(GestureHandlerRootView);
