import { Platform } from "react-native";

// Android falls back to the app icon; named shortcut icons are iOS-only.
export const matchesIcon = Platform.select({
  ios: "symbol:message.fill",
  default: undefined,
});

export const editProfileIcon = Platform.select({
  ios: "symbol:person.fill",
  default: undefined,
});
