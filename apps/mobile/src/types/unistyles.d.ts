import type { DarkTheme, LightTheme } from "@pegada/shared/themes/themes";

type AppThemes = {
  light: typeof LightTheme;
  dark: typeof DarkTheme;
};

declare module "react-native-unistyles" {
  // oxlint-disable-next-line typescript/no-empty-object-type -- the whole point
  // of the augmentation is to graft the app themes onto Unistyles' empty
  // interface; an empty body is how the library asks for it.
  export interface UnistylesThemes extends AppThemes {}
}
