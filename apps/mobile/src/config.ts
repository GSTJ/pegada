// https://github.com/uuidjs/uuid#getrandomvalues-not-supported
import "react-native-get-random-values";
import "@/why-did-you-render";

import * as React from "react";
import { LogBox, Text, View } from "react-native";
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";
import * as Updates from "expo-updates";
import Bugsnag from "@bugsnag/expo";
import BugsnagPluginReact, {
  BugsnagErrorBoundary as IBugsnagErrorBoundary
} from "@bugsnag/plugin-react";

import { ampli } from "@/ampli";
import { config } from "@/services/config";
import { sendError } from "@/services/errorTracking";

mobileAds()
  .setRequestConfiguration({
    // Currently, the app is only available for users over 18
    // PG is a good default for now, as MA outputs too explicit ads
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false
  })
  .catch(sendError);

mobileAds().initialize().catch(sendError);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
Text.defaultProps = Text.defaultProps || {};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
Text.defaultProps.allowFontScaling = false;

// Not helpful as there is nothing I can do about them
LogBox.ignoreLogs([
  "Sending `onAnimatedValueUpdate` with no listeners registered.",
  "WARNING: Ampli is already initialized.",
  "Warning: Overriding previous layout animation with new one before the first began:"
]);

ampli.load({
  environment: config.ENV,
  client: {
    configuration: {
      logLevel: 0 // None
    },
    apiKey: config.AMPLITUDE_API_KEY
  }
});

const manifest = Updates.manifest;
const metadata = "metadata" in manifest ? manifest.metadata : undefined;
const updateGroup =
  metadata && "updateGroup" in metadata ? metadata.updateGroup : undefined;

Bugsnag.start({
  apiKey: config.BUGSNAG_API_KEY,
  codeBundleId: (updateGroup as string) || "",
  metadata: { env: config.ENV },
  plugins: [new BugsnagPluginReact()],
  releaseStage: config.ENV,
  enabledReleaseStages: ["production", "staging"],
  logger: null
});

Bugsnag.setContext("app");

export const BugsnagErrorBoundary: IBugsnagErrorBoundary =
  Bugsnag.getPlugin("react")?.createErrorBoundary(React) || View;
