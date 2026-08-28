import type { StorageDataTypes } from "@/services/storage";

import type { ColorSchemeName } from "react-native";

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import * as React from "react";
import { Appearance, Platform, Settings, useColorScheme } from "react-native";

import * as SystemUI from "expo-system-ui";

import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { UnistylesRuntime, useUnistyles } from "react-native-unistyles";

import { sendError } from "@/services/error-tracking";
import {
  deleteData,
  getData,
  StorageKeys,
  storeData,
  Theme,
} from "@/services/storage";

export type ActiveTheme = StorageDataTypes[StorageKeys.Theme] | null;

// Kicked off at import time so the stored theme override is resolved as
// early as possible. The splash screen is kept visible until this settles
// (see app/_layout.tsx), so the first visible frame already uses the right
// theme instead of painting the system one and then flipping — the
// white/dark "blink" at boot.
export const storedThemePromise: Promise<ActiveTheme> = getData(
  StorageKeys.Theme,
).catch((error) => {
  sendError(error);
  return null;
});

// Mirrors the forced theme into iOS UserDefaults so the native layer can
// apply it to the window BEFORE the splash screen renders on the next cold
// start (see plugins/withInitialThemeOverride.js). Without this the native
// splash always follows the system appearance, which is what made the boot
// blink white for users who forced dark mode on a light-mode device.
const persistNativeThemeOverride = (theme: ActiveTheme) => {
  if (Platform.OS !== "ios") return;
  Settings.set({ pegadaThemeOverride: theme ?? "system" });
};

const ThemeContext = React.createContext<{
  activeTheme: ActiveTheme;
  setActiveTheme: (theme: ActiveTheme) => Promise<unknown>;
}>({
  activeTheme: null,
  setActiveTheme: async () => {},
});

export const useActiveTheme = () => {
  const context = useContext(ThemeContext);
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const colorScheme = useColorScheme();
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(null);

  // Read back from the registry this provider writes to below, so the
  // Navigation theme and the stylesheets can never disagree about which theme
  // is active. `colors` and `dark` are read off the proxy rather than kept as
  // `theme`: the proxy is rebuilt on every render, so depending on it would
  // re-run every effect and memo below on every render, while the values
  // behind it keep their identity until the theme actually changes.
  const { colors, dark } = useUnistyles().theme;

  // Apply the stored theme on component mount
  useEffect(() => {
    const applyStoredTheme = async () => {
      const storedTheme = await storedThemePromise;
      if (storedTheme)
        Appearance.setColorScheme(storedTheme as ColorSchemeName);
      persistNativeThemeOverride(storedTheme);
      setActiveTheme(storedTheme);
    };

    applyStoredTheme().catch(sendError);
  }, []);

  // The user's explicit choice wins; the system scheme is only a fallback.
  // Deriving the forced theme from useColorScheme() alone (via the
  // Appearance.setColorScheme side effect) proved fragile: anything that
  // re-publishes the system scheme flips the app back, leaving themed text
  // on a mismatched background.
  //
  // Only the NAME is derived here. The theme object itself comes from
  // Unistyles, which is the single registry now — anything unregistered falls
  // back to the default exactly as the old `?? themes[Theme.Default]` did.
  const requested = activeTheme ?? colorScheme ?? Theme.Default;
  const themeName = requested === Theme.Dark ? "dark" : "light";

  // Keep the native window/root background in sync with the theme so any
  // pixel not covered by a themed view (boot, transitions, error states)
  // shows the theme background instead of a stale system color.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(sendError);
  }, [colors.background]);

  // Unistyles keeps its theme registry outside React, so switching themes
  // means writing to it. This provider owns the stored override, which makes
  // it the only writer — and now that nothing else styles the tree, this call
  // IS the theme switch rather than a mirror of one.
  //
  // A LAYOUT effect, not a passive one. `setTheme` does not repaint anything
  // itself: the native side queues the rebuild onto the JS thread
  // (`callInvoker->invokeAsync`) and only then updates the shadow tree and
  // wakes the `useUnistyles` subscribers. Every scheduler turn between the
  // decision and that queue is a turn the tree spends in the previous theme,
  // and layout effects run inside the commit while passive effects run a turn
  // later. That turn is the boot blink the stored-theme handling above exists
  // to prevent, and it would now show on the settings toggle too.
  //
  // Not during render, which would be earlier still: a concurrent render that
  // React throws away would have switched the app's theme anyway.
  //
  // Not at the two call sites that change the theme either, tempting as it is
  // to write it where the decision is made: the system scheme can change with
  // no stored override involved, and `colorScheme` is the only thing that
  // sees that.
  useLayoutEffect(() => {
    if (UnistylesRuntime.themeName === themeName) return;
    UnistylesRuntime.setTheme(themeName);
  }, [themeName]);

  // React Navigation paints every screen container with ITS theme, not the
  // app's. Without this provider the Stack uses the default light background
  // regardless of the app theme, flashing white behind transitions and behind
  // screens without an explicit background.
  const navigationTheme = useMemo(() => {
    const base = dark ? NavigationDarkTheme : NavigationLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, dark]);

  const handleActiveThemeChange = (theme: ActiveTheme) => {
    if (theme) Appearance.setColorScheme(theme as ColorSchemeName);
    persistNativeThemeOverride(theme);
    setActiveTheme(theme);

    if (!theme) return deleteData(StorageKeys.Theme);
    return storeData(StorageKeys.Theme, theme);
  };

  const themeContextValue = useMemo(
    () => ({ activeTheme, setActiveTheme: handleActiveThemeChange }),
    [activeTheme],
  );

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <NavigationThemeProvider value={navigationTheme}>
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
};
