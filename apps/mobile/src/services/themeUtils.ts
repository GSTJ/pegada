import { DefaultTheme } from "styled-components/native";

export const getSpacing =
  (spacing: keyof DefaultTheme["spacing"]) =>
  ({ theme }: { theme: DefaultTheme }) => {
    return theme.spacing[spacing] + "px";
  };
