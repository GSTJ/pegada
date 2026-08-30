import { requireOptionalNativeModule } from "expo-modules-core";

type PegadaThemeOverrideModule = {
  /** Mirrors the in-app theme choice into SharedPreferences for native boot. */
  set: (value: "dark" | "light" | "system") => void;
};

/**
 * Android-only counterpart to iOS's `Settings.set({ pegadaThemeOverride })`.
 * Null on iOS/Expo Go, where this module isn't present.
 */
export default requireOptionalNativeModule<PegadaThemeOverrideModule>(
  "PegadaThemeOverride",
);
