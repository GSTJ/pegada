import { config } from "@/services/config";

/**
 * Whether this build is the Maestro E2E build, and therefore allowed to take
 * shortcuts a real user must never see.
 *
 * GATED on TWO independent env signals so a production build can never open
 * the escape hatch even if one of them is misconfigured:
 *
 *   1. `config.ENV !== "production"` — production releases always set
 *      `EXPO_PUBLIC_ENV=production` (the Zod schema accepts only
 *      `"development"` | `"production"`), so a real App Store build fails
 *      this regardless of other env state.
 *   2. `config.MAESTRO_E2E === "1"` — set only by the Maestro CI build
 *      (`.github/workflows/e2e-mobile.yml`) and by a developer explicitly
 *      running `EXPO_PUBLIC_MAESTRO_E2E=1 expo run:ios`.
 *
 * Mirrors the BE-mocked purchase gating in `services/payments`
 * (`isMaestroMockMode`, paired with `MAESTRO_E2E=1` AND
 * `NODE_ENV !== "production"` on the API side), so the whole Maestro-only
 * surface uses one pattern — and now one definition.
 *
 * `__DEV__` is deliberately NOT part of it: the E2E suite runs against
 * `--configuration Release` builds, where `__DEV__` is false.
 */
export const isMaestroE2EBuild = (): boolean =>
  config.ENV !== "production" && config.MAESTRO_E2E === "1";
