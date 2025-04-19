import Bugsnag from "@bugsnag/expo";

import { config } from "./config";

export const sendError = (error: any) => {
  if (config.ENV === "development") {
    // eslint-disable-next-line no-console
    console.error(error);
  } else {
    Bugsnag.notify(error);
  }
};
