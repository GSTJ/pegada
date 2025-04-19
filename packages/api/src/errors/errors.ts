// Init Bugsnag
import "./start";

import Bugsnag from "@bugsnag/js";

import { config } from "../shared/config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendError = (error: any) => {
  if (config.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  Bugsnag.notify(error);
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
