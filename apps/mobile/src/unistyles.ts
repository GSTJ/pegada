import { Appearance } from "react-native";

import { DarkTheme, LightTheme } from "@pegada/shared/themes/themes";
import { StyleSheet } from "react-native-unistyles";

/**
 * Unistyles' theme registry. The React tree's ThemeProvider
 * (`src/contexts/theme-provider.tsx`) stays the source of truth for which
 * theme is active — it mirrors every change here through
 * `UnistylesRuntime.setTheme`. That is also why `adaptiveThemes` is off:
 * it and `initialTheme` are mutually exclusive, and letting Unistyles follow
 * the system scheme on its own would fight the stored user override.
 *
 * Imported for its side effect as the very first line of `index.js`, before
 * anything can call `StyleSheet.create`.
 */
export const appThemes = {
  light: LightTheme,
  dark: DarkTheme,
};

StyleSheet.configure({
  themes: appThemes,
  settings: {
    // ThemeProvider resolves the stored override asynchronously; the system
    // scheme is the right first paint until it does.
    initialTheme: () =>
      Appearance.getColorScheme() === "dark" ? "dark" : "light",
  },
});
