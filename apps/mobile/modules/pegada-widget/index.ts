import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Identifiers shared between JS and the native widget code. If you touch
 * these, update the matching constants in:
 * - ios/PegadaWidgetModule.swift
 * - android/src/main/java/app/pegada/widget/PegadaWidgetModule.kt
 * - targets/pegada-widgets/MatchesWidget.swift
 */
export const WIDGET_APP_GROUP = "group.app.pegada";

/**
 * The dogs shown on the widget. Avatars are ABSOLUTE file paths (no file://
 * scheme) readable by the widget process: inside the App Group container on
 * iOS, inside the app's document directory on Android.
 */
export type WidgetSnapshotDog = {
  name: string;
  avatar: string | null;
};

/**
 * All user-facing strings arrive pre-localized from JS (i18next), so the
 * native side stays data-driven and never hardcodes copy. `message` always
 * matches the current state (waiting count, all caught up, or logged out).
 */
export type WidgetSnapshot = {
  loggedIn: boolean;
  count: number;
  message: string;
  dogs: WidgetSnapshotDog[];
};

type PegadaWidgetNativeModule = {
  setSnapshot(json: string): Promise<void>;
};

// Optional so web (and any environment without the native module, e.g.
// tests) degrades to a no-op instead of throwing at import time.
const nativeModule = requireOptionalNativeModule<PegadaWidgetNativeModule>("PegadaWidget");

/**
 * Persists the snapshot where the home-screen widgets can read it
 * (App Group UserDefaults on iOS, SharedPreferences on Android) and asks
 * the OS to re-render the widget timelines.
 */
export const setWidgetSnapshot = async (snapshot: WidgetSnapshot): Promise<void> => {
  await nativeModule?.setSnapshot(JSON.stringify(snapshot));
};

export const isWidgetModuleAvailable = () => nativeModule != null;
