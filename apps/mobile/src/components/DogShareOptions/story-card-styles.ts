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
 * A single brand hue at three lightnesses: a blush so pale it barely reads
 * behind the photo, down to a muted plum at the bottom, where the name and
 * brand mark need to read as white text. Softer at every stop than a poster
 * pink should be — the photo is the hero, and the ground is there to hold
 * white text legibly, not to compete with it. Fixed rather than pulled from
 * `useUnistyles` — a story image is a brand artifact a viewer sees outside
 * the app, so it should not flip with the poster's device theme.
 */
export const GROUND_GRADIENT = [
  "hsl(333, 38%, 97%)",
  "hsl(333, 42%, 90%)",
  "hsl(333, 52%, 27%)",
] as const;

export const PHOTO_FALLBACK_COLOR = "hsl(333, 42%, 64%)";

export const styles = StyleSheet.create(() => ({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "hsl(333, 52%, 27%)",
    overflow: "hidden",
  },
  ground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  /**
   * The photo carries most of the frame's weight — 73% of the card height,
   * up from an earlier draft's 66% — so there is less ground left exposed to
   * begin with. What's left below it is closed up tight: `textBlock` and
   * `brandRow` sit close enough together that nothing reads as an orphaned
   * band of flat colour between them.
   */
  photoSlot: {
    marginTop: 28,
    marginLeft: 24,
    marginRight: 24,
    height: 468,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.85)",
    backgroundColor: PHOTO_FALLBACK_COLOR,
  },
  photo: {
    flex: 1,
  },
  photoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    marginTop: 18,
    marginLeft: 28,
    marginRight: 28,
    gap: 6,
  },
  name: {
    fontSize: 32,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.88)",
  },
  brandRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  brandText: {
    fontSize: 15,
    color: "white",
    letterSpacing: 0.4,
  },
}));
