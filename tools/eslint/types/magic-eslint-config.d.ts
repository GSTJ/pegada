declare module "magic-eslint-config/base" {
  import type { Linter } from "eslint";
  const config: Linter.Config;
  export default config;
}

declare module "magic-eslint-config/react-native" {
  import type { Linter } from "eslint";
  const config: Linter.Config;
  export default config;
}

declare module "magic-eslint-config/next" {
  import type { Linter } from "eslint";
  const config: Linter.Config;
  export default config;
}
