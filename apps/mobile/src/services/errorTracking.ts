import Bugsnag from "@bugsnag/expo";
import { isError } from "lodash";

import { config } from "./config";

export const sendError = (error: unknown) => {
  if (config.ENV === "development") {
    // eslint-disable-next-line no-console
    console.error(error);
  } else if (isError(error)) {
    Bugsnag.notify(error);
  } else {
    Bugsnag.notify(new Error(String(error)));
  }
};
