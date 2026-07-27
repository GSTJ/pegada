import { config } from "../shared/config";
import { posthog } from "../shared/posthog";

// oxlint-disable-next-line typescript/no-explicit-any -- Anything can be thrown, and this is the boundary that has to accept it.
export const sendError = (error: any) => {
  if (config.NODE_ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.error(error);
  }

  posthog.captureException(error);
};

export const logDebug = (...props: unknown[]) => {
  if (config.NODE_ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.log(...props);
  }
};

export const errorDebug = (...props: unknown[]) => {
  if (config.NODE_ENV === "development") {
    // oxlint-disable-next-line no-console -- Development-only mirror of what gets reported to PostHog.
    console.error(...props);
  }
};
