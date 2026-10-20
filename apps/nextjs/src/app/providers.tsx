"use client";

import type { ObservabilityClient } from "magic-observability";

import { createNoopClient } from "magic-observability";
import { ObservabilityBoundary } from "magic-observability/boundary";

import { SomethingWentWrong } from "@/components/something-went-wrong";
import { captureError } from "@/services/analytics";

// Hoisted out of the render: a fresh object on every render is a new prop
// identity, which re-renders the boundary for nothing.
const BOUNDARY_CONTEXT = { boundary: "root" };

/**
 * The boundary only ever calls `captureError`, and that goes through the
 * lazily loaded PostHog in `services/analytics`. Importing the boundary from
 * `magic-observability/react` instead would put `posthog-js` back in the first
 * bundle, which is what this file used to do.
 */
const BOUNDARY_CLIENT: ObservabilityClient = {
  ...createNoopClient("missing-key"),
  captureError,
};

/**
 * A top-level error boundary that reports to PostHog.
 *
 * There is no PostHog React provider: nothing on the site calls
 * `usePostHog()`, and mounting one would need `posthog-js` before hydration.
 *
 * `fallback` is passed as a component rather than an element so the boundary
 * can hand it `reset` — that is what makes its "Try again" button work.
 *
 * `app/error.tsx` still exists and still reports: it is Next's own route-level
 * boundary, and it catches the things this one is mounted beneath.
 */
export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ObservabilityBoundary
    client={BOUNDARY_CLIENT}
    context={BOUNDARY_CONTEXT}
    fallback={SomethingWentWrong}
  >
    {children}
  </ObservabilityBoundary>
);
