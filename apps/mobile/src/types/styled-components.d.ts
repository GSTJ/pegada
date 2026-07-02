import "styled-components";

import { DefaultTheme as DefaultPegadaTheme } from "@pegada/shared/themes/themes";

type PegadaTheme = typeof DefaultPegadaTheme;

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends PegadaTheme {}
}

declare module "styled-components/native" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends PegadaTheme {}
}
