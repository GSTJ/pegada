import type WhyDidYouRender from "@welldone-software/why-did-you-render";
import * as React from "react";

import { config } from "@/services/config";

if (config.ENV === "development") {
  const whyDidYouRender: typeof WhyDidYouRender = require("@welldone-software/why-did-you-render");
  whyDidYouRender(React, {
    // Enable tracking in all pure components by default
    trackAllPureComponents: true,

    include: [
      // Uncomment to enable tracking in all components. Must also uncomment /^Screen/ in exclude.
      // /.*/,
      // Uncomment to enable tracking by displayName, e.g.:
      // /^Avatar/,
      // /^ReportActionItem/,
      // /^ReportActionItemSingle/,
    ],

    exclude: [
      // Uncomment to enable tracking in all components
      // /^Screen/
    ]
  });
}
