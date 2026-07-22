import { Platform } from "react-native";

// expo-quick-actions icons are iOS-only (SF Symbols / built-in system
// icons, see the library's README). Android has no built-in named icons --
// only custom drawables via its config plugin -- so we pass `undefined`
// there and let the shortcut fall back to the app's own icon, which keeps
// this simple without shipping extra icon assets.
export const matchesIcon = Platform.select({ ios: "symbol:message.fill", default: undefined });

export const editProfileIcon = Platform.select({ ios: "symbol:person.fill", default: undefined });
