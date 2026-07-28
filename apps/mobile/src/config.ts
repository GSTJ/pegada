// https://github.com/uuidjs/uuid#getrandomvalues-not-supported
import "react-native-get-random-values";
import { LogBox, Text } from "react-native";

import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";

import { sendError } from "@/services/error-tracking";
// Side-effect import: constructs the PostHog client (and installs its global
// uncaught-exception / unhandled-rejection handlers) before anything below
// runs. `initExpo` registers `environment` and `release` — the OTA update
// group that ties a stack trace to its uploaded sourcemaps — as super
// properties itself, which is what the hand-rolled `posthog.register(...)`
// block that used to live at the bottom of this file was doing.
import "@/services/observability";

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
