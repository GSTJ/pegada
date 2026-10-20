import type { CSSProperties } from "react";

/** Inline custom properties, which React's `style` type does not know about. */
export const cssVars = (vars: Record<`--${string}`, string | number>) =>
  vars as CSSProperties;
