import { useContext, useEffect, useState } from "react";
import * as React from "react";
import { Appearance, useColorScheme } from "react-native";
import { ThemeProvider as StyledThemeProvider } from "styled-components/native";

import { DarkTheme, LightTheme } from "@pegada/shared/themes/themes";

import { sendError } from "@/services/errorTracking";
import {
  deleteData,
  getData,
  StorageDataTypes,
  StorageKeys,
  storeData,
  Theme
} from "@/services/storage";

export const themes = {
  [Theme.Light]: LightTheme,
  [Theme.Dark]: DarkTheme
};

export type ActiveTheme = StorageDataTypes[StorageKeys.Theme] | null;

const ThemeContext = React.createContext<{
  activeTheme: ActiveTheme;
  setActiveTheme: (theme: ActiveTheme) => Promise<unknown>;
}>({
  activeTheme: null,
  setActiveTheme: async () => {}
});

export const useActiveTheme = () => {
  const context = useContext(ThemeContext);
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactElement }> = ({
  children
}) => {
  const colorScheme = useColorScheme();
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(null);

  // Fetch theme from AsyncStorage on component mount
  useEffect(() => {
    const fetchThemeFromStorage = async () => {
      const storedTheme = await getData(StorageKeys.Theme);
      Appearance.setColorScheme(storedTheme);
      setActiveTheme(storedTheme);
    };

    fetchThemeFromStorage().catch(sendError);
  }, []);

  const theme = themes[colorScheme ?? Theme.Default];

  const handleActiveThemeChange = async (theme: ActiveTheme) => {
    Appearance.setColorScheme(theme);
    setActiveTheme(theme);

    if (!theme) return deleteData(StorageKeys.Theme);
    return storeData(StorageKeys.Theme, theme);
  };

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        setActiveTheme: handleActiveThemeChange
      }}
    >
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
};
