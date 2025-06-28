import "dotenv/config";

import Bugsnag from "@bugsnag/js";

import { config } from "../shared/config";

Bugsnag.start({
  apiKey: config.BUGSNAG_API_KEY,
  releaseStage: config.NODE_ENV
});

Bugsnag.setContext("server");
