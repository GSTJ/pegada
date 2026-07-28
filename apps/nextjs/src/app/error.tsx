"use client";

import { useEffect } from "react";

import { captureError } from "magic-observability/web";

import { SomethingWentWrong } from "@/components/something-went-wrong";

/**
 * Next's route-level error boundary. It is a client component, so it reports
 * through the browser client rather than `magic-observability/next` — the
 * server half never sees an error React caught during hydration or a client
 * render.
 *
 * The `<html>`/`<body>` wrapper is deliberate and predates this change: this
 * file stands in for `global-error.tsx` too, and a boundary that replaces the
 * root layout has to render the document shell itself.
 */
const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  useEffect(() => {
    captureError(error, {
      source: "app-error-boundary",
      // Next replaces a server error's message with a digest in production;
      // it is the only handle that ties this event to the server-side log.
      ...(error.digest ? { digest: error.digest } : {}),
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <SomethingWentWrong reset={reset} />
      </body>
    </html>
  );
};

export default GlobalError;
