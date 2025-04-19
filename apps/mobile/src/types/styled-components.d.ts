import "styled-components";

import { DefaultTheme as DefaultPegadaTheme } from "@pegada/shared/themes/themes";

type PegadaTheme = typeof DefaultPegadaTheme;

declare module "styled-components" {
  export type DefaultTheme = PegadaTheme;
}

declare module "styled-components/native" {
  export type DefaultTheme = PegadaTheme;
}
