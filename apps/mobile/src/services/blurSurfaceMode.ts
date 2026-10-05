export type ReduceTransparencyPreference = boolean | null;
export type BlurEffectPolicy = "stable" | "opacity-safe";
export type BlurSurfaceMode = "flat" | "glass" | "legacy" | "opaque";

interface ResolveBlurSurfaceModeOptions {
  effectPolicy?: BlurEffectPolicy;
  liquidGlassAvailable: boolean;
  reduceTransparencyEnabled: ReduceTransparencyPreference;
}

/**
 * Picks the native material only when its complete ancestor chain is stable.
 * UIVisualEffectView and Liquid Glass do not compose correctly below an
 * alpha-animated ancestor, so those call sites must request `opacity-safe`.
 */
export const resolveBlurSurfaceMode = ({
  effectPolicy = "stable",
  liquidGlassAvailable,
  reduceTransparencyEnabled,
}: ResolveBlurSurfaceModeOptions): BlurSurfaceMode => {
  // Unknown accessibility state is intentionally treated as enabled. The app
  // keeps the splash visible until the initial preference settles.
  if (reduceTransparencyEnabled !== false) return "opaque";

  // Call sites whose ancestors animate opacity opt into a layout-preserving
  // effect-free surface. Focus changes alone must not swap native roots:
  // doing so remounts children and makes materials snap during navigation.
  if (effectPolicy === "opacity-safe") return "flat";

  if (liquidGlassAvailable) return "glass";

  return "legacy";
};
