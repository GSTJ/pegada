import "styled-components";
import { DefaultTheme as DefaultPegadaTheme } from "@pegada/shared/themes/themes";

type PegadaTheme = typeof DefaultPegadaTheme;

declare module "styled-components" {
  // oxlint-disable-next-line typescript/no-empty-object-type -- styled-components' DefaultTheme is augmented by extension; an empty body is the whole point.
  export interface DefaultTheme extends PegadaTheme {}
}

declare module "styled-components/native" {
  // oxlint-disable-next-line typescript/no-empty-object-type -- styled-components' DefaultTheme is augmented by extension; an empty body is the whole point.
  export interface DefaultTheme extends PegadaTheme {}
}
