import { config } from "./config";
import { posthog } from "./posthog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendError = (error: any) => {
  if (config.ENV === "development") {
    // eslint-disable-next-line no-console
    console.error(error);
  } else {
    posthog.captureException(error);
  }
};
