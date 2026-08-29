import type { ActiveTheme } from "./theme-provider";

import { Appearance, Platform, Settings } from "react-native";

import PegadaThemeOverride from "../../modules/pegada-theme-override";
import { applyStoredTheme, persistNativeThemeOverride } from "./theme-provider";

jest.mock<Record<string, unknown>>(
  "../../modules/pegada-theme-override",
  () => ({
    __esModule: true,
    default: { set: jest.fn() },
  }),
);

jest.mock<Record<string, unknown>>("react-native", () => ({
  Appearance: { setColorScheme: jest.fn() },
  Platform: { OS: "ios" },
  Settings: { set: jest.fn() },
}));

jest.mock<Record<string, unknown>>("expo-system-ui", () => ({
  setBackgroundColorAsync: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@react-navigation/native", () => ({
  DarkTheme: {},
  DefaultTheme: {},
  ThemeProvider: ({ children }: { children: unknown }) => children,
}));

jest.mock<Record<string, unknown>>("react-native-unistyles", () => ({
  UnistylesRuntime: { setTheme: jest.fn() },
  useUnistyles: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/storage", () => ({
  StorageKeys: { Theme: "theme" },
  Theme: { Dark: "dark", Default: "light", Light: "light" },
  deleteData: jest.fn(),
  getData: jest.fn().mockResolvedValue(null),
  storeData: jest.fn(),
}));

const appearance = jest.mocked(Appearance);
const nativeThemeOverride = jest.mocked(PegadaThemeOverride!);
const settings = jest.mocked(Settings);

const DARK = "dark" as ActiveTheme;
const LIGHT = "light" as ActiveTheme;

test("releases a forced scheme and persists follow-system for Automatic", () => {
  applyStoredTheme(null);

  expect(appearance.setColorScheme).toHaveBeenCalledWith(null);
  expect(settings.set).toHaveBeenCalledWith({
    pegadaThemeOverride: "system",
  });
});

test("still forces and persists an explicit dark/light choice", () => {
  applyStoredTheme(DARK);

  expect(appearance.setColorScheme).toHaveBeenCalledWith(DARK);
  expect(settings.set).toHaveBeenCalledWith({ pegadaThemeOverride: "dark" });
});

test("skips UserDefaults on Android", () => {
  nativeThemeOverride.set.mockClear();
  settings.set.mockClear();
  Platform.OS = "android";

  persistNativeThemeOverride(LIGHT);

  expect(nativeThemeOverride.set).toHaveBeenCalledWith("light");
  expect(settings.set).not.toHaveBeenCalled();
  Platform.OS = "ios";
});
