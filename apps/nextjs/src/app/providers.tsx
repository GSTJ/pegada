"use client";

import {
  ObservabilityBoundary,
  ObservabilityProvider,
} from "magic-observability/react";
import { getWebClient } from "magic-observability/web";

import { SomethingWentWrong } from "@/components/something-went-wrong";

// Hoisted out of the render: a fresh object on every render is a new prop
// identity, which re-renders the boundary for nothing.
const BOUNDARY_CONTEXT = { boundary: "root" };

/**
 * PostHog's React context plus a top-level error boundary.
 *
 * The client itself is built in `instrumentation-client.ts`, which Next
 * evaluates before hydration; `getWebClient()` picks up whatever that produced
 * — a real client, or the no-op one that exists while this project has no
 * `NEXT_PUBLIC_POSTHOG_KEY`. `ObservabilityProvider` renders nothing but its
 * children in the no-op case, on purpose: a provider handing an uninitialised
 * `posthog-js` to `usePostHog()` gives every consumer a client that queues
 * events forever.
 *
 * `fallback` is passed as a component rather than an element so the boundary
 * can hand it `reset` — that is what makes its "Try again" button work.
 *
 * `app/error.tsx` still exists and still reports: it is Next's own route-level
 * boundary, and it catches the things this one is mounted beneath.
 */
export const Providers = ({ children }: { children: React.ReactNode }) => (
  <ObservabilityProvider>
    <ObservabilityBoundary
      client={getWebClient()}
      context={BOUNDARY_CONTEXT}
      fallback={SomethingWentWrong}
    >
      {children}
    </ObservabilityBoundary>
  </ObservabilityProvider>
);
