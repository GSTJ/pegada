import { Dimensions } from "react-native";

export const { width, height } = Dimensions.get("screen");

export const CARD = {
  CARD_WIDTH: width * 0.9,
  CARD_HEIGHT: height * 0.78,
  CARD_OUT_HEIGHT: height * 1.7,
  CARD_OUT_WIDTH: width * 1.7,
};

export const ACTION_OFFSET = 100;
export const ACTION_VELOCITY = 1000;
export const ACTION_THRESHOLD = 1 / 35;

export const APP_SHARE_LINK_BASE = "https://www.pegada.app";

/**
 * Enables the Reanimated shared-element transition (`sharedTransitionTag`)
 * from the swipe card photo to the DogProfile photo.
 *
 * This relies on Reanimated's `ENABLE_SHARED_ELEMENT_TRANSITIONS` static
 * feature flag (see `apps/mobile/package.json`'s `reanimated.staticFeatureFlags`),
 * which the API docs still call experimental. Flip this to `false` (single
 * line, no native rebuild needed) to fall back to the plain stack "fade"
 * animation if the transition ever misbehaves (flicker, wrong geometry,
 * gesture interference) on a device/OS combination we haven't tested.
 */
export const SHARED_ELEMENT_TRANSITIONS_ENABLED = true;
