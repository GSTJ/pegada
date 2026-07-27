import { config } from "./config";
import { posthog } from "./posthog";

// oxlint-disable-next-line typescript/no-explicit-any -- Anything can be thrown, and this is the boundary that has to accept it.
export const sendError = (error: any) => {
  if (config.ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.error(error);
  } else {
    posthog.captureException(error);
  }
};
