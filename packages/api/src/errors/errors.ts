import { config } from "../shared/config";
import { posthog } from "../shared/posthog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendError = (error: any) => {
  if (config.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  posthog.captureException(error);
};

export const logDebug = (...props: unknown[]) => {
  if (config.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(...props);
  }
};

export const errorDebug = (...props: unknown[]) => {
  if (config.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.error(...props);
  }
};
