import type { CSSProperties } from "react";

/**
 * Where a `data-role="card"` sits in its group, for the reveal stagger in
 * `globals.css` (60ms a step). Kept out of `reveal.tsx` so server components
 * can call it: a `"use client"` module only hands them references.
 */
export const staggerStyle = (index: number) =>
  ({ "--i": index }) as CSSProperties;
