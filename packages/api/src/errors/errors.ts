// Init Bugsnag
import "./start";

import Bugsnag from "@bugsnag/js";

import { config } from "../shared/config";

export const sendError = (error: unknown) => {
  if (config.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.error(error);
  }

  Bugsnag.notify(
    error instanceof Error ? error : new Error(JSON.stringify(error))
  );
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
