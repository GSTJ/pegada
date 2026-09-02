import { StyleSheet } from "react-native-unistyles";

/**
 * The card is laid out at a fixed dp size, not the device's own width, so
 * everything inside is sized off these constants rather than the window and
 * the exported PNG always frames the same way regardless of the device it
 * was captured on.
 *
 * `captureRef`'s `width`/`height` options are in POINTS, not pixels — iOS
 * multiplies whatever is passed by the screen's own pixel ratio when it
 * rasterizes the view. Asking for `{ width: 1080, height: 1920 }` therefore
 * does not produce a 1080x1920 PNG: on a 3x device it produces 3240x5760,
 * three times the intended size. To land on `EXPORT_PNG_WIDTH` x
 * `EXPORT_PNG_HEIGHT` pixels on any device, divide both by
 * `PixelRatio.get()` before passing them to `captureRef` (see
 * `handleShareStory` in `./index.tsx`) — `captureRef` has no separate scale
 * option, so this division is the only way to counteract the multiplication.
 */
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;

/** The exported story PNG's pixel dimensions, 9:16 to match the card. */
export const EXPORT_PNG_WIDTH = 1080;
export const EXPORT_PNG_HEIGHT = 1920;

/**
 * The card's own background, visible for the instant before a variant's own
 * backdrop paints over it (and as a safety net if a variant ever leaves a
 * gap). Fixed rather than pulled from `useUnistyles` — this is a brand
 * artifact a viewer sees outside the app, so it should not flip with the
 * device's own theme. The actual per-variant palettes live in
 * `story/constants.ts`.
 */
export const styles = StyleSheet.create(() => ({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#3A0F27",
    overflow: "hidden",
  },
}));
