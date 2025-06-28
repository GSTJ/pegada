/* eslint-disable @typescript-eslint/no-empty-object-type */
import "styled-components";

import type { DefaultTheme as DefaultPegadaTheme } from "@pegada/shared/themes/themes";

type PegadaTheme = typeof DefaultPegadaTheme;

declare module "styled-components" {
  export interface DefaultTheme extends PegadaTheme {}
}

declare module "styled-components/native" {
  export interface DefaultTheme extends PegadaTheme {}
}
