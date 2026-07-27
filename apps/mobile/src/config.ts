// https://github.com/uuidjs/uuid#getrandomvalues-not-supported
import "react-native-get-random-values";
import { LogBox, Text } from "react-native";

import * as Updates from "expo-updates";

import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";

import { config } from "@/services/config";
import { sendError } from "@/services/error-tracking";
import { posthog } from "@/services/posthog";

mobileAds()
  .setRequestConfiguration({
    // Currently, the app is only available for users over 18
    // PG is a good default for now, as MA outputs too explicit ads
    maxAdContentRating: MaxAdContentRating.PG,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  })
  .catch(sendError);

mobileAds().initialize().catch(sendError);

// oxlint-disable-next-line typescript/ban-ts-comment -- React Native's Text.defaultProps is untyped but is the only way to set app-wide font scaling.
// @ts-expect-error
Text.defaultProps ||= {};
// oxlint-disable-next-line typescript/ban-ts-comment -- React Native's Text.defaultProps is untyped but is the only way to set app-wide font scaling.
// @ts-expect-error
Text.defaultProps.allowFontScaling = false;

// Not helpful as there is nothing I can do about them
LogBox.ignoreLogs([
  "Sending `onAnimatedValueUpdate` with no listeners registered.",
  "Warning: Overriding previous layout animation with new one before the first began:",
]);

// Attach env + release to every event (analytics and errors), the way
// Bugsnag's releaseStage / metadata used to. codeBundleId ties errors to
// the exact OTA update group.
const { manifest } = Updates;
const metadata = "metadata" in manifest ? manifest.metadata : undefined;
const updateGroup =
  metadata && "updateGroup" in metadata ? metadata.updateGroup : undefined;

posthog.register({
  environment: config.ENV,
  code_bundle_id: (updateGroup as string) || "",
});
