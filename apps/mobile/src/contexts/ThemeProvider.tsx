import { useContext, useEffect, useMemo, useState } from "react";
import * as React from "react";
import { Appearance, ColorSchemeName, Platform, Settings, useColorScheme } from "react-native";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import * as SystemUI from "expo-system-ui";
import { ThemeProvider as StyledThemeProvider } from "styled-components/native";

import { DarkTheme, LightTheme } from "@pegada/shared/themes/themes";

import { sendError } from "@/services/errorTracking";
import {
  deleteData,
  getData,
  StorageDataTypes,
  StorageKeys,
  storeData,
  Theme,
} from "@/services/storage";

export const themes = {
  [Theme.Light]: LightTheme,
  [Theme.Dark]: DarkTheme,
};

export type ActiveTheme = StorageDataTypes[StorageKeys.Theme] | null;

// Kicked off at import time so the stored theme override is resolved as
// early as possible. The splash screen is kept visible until this settles
// (see app/_layout.tsx), so the first visible frame already uses the right
// theme instead of painting the system one and then flipping — the
// white/dark "blink" at boot.
export const storedThemePromise: Promise<ActiveTheme> = getData(StorageKeys.Theme).catch(
  (error) => {
    sendError(error);
    return null;
  },
);

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

export const ThemeProvider: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(null);

  // Apply the stored theme on component mount
  useEffect(() => {
    const applyStoredTheme = async () => {
      const storedTheme = await storedThemePromise;
      if (storedTheme) Appearance.setColorScheme(storedTheme as ColorSchemeName);
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
  const theme =
    themes[(activeTheme as Theme) ?? (colorScheme as Theme) ?? Theme.Default] ??
    themes[Theme.Default];

  // Keep the native window/root background in sync with the theme so any
  // pixel not covered by a themed view (boot, transitions, error states)
  // shows the theme background instead of a stale system color.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(sendError);
  }, [theme]);

  // React Navigation paints every screen container with ITS theme, not the
  // styled-components one. Without this provider the Stack uses the default
  // light background regardless of the app theme, flashing white behind
  // transitions and behind screens without an explicit background.
  const navigationTheme = useMemo(() => {
    const base = theme.dark ? NavigationDarkTheme : NavigationLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.card,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  const handleActiveThemeChange = async (theme: ActiveTheme) => {
    if (theme) Appearance.setColorScheme(theme as ColorSchemeName);
    persistNativeThemeOverride(theme);
    setActiveTheme(theme);

    if (!theme) return deleteData(StorageKeys.Theme);
    return storeData(StorageKeys.Theme, theme);
  };

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        setActiveTheme: handleActiveThemeChange,
      }}
    >
      <NavigationThemeProvider value={navigationTheme}>
        <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
};
