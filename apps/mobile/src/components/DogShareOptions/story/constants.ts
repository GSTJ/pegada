import { CARD_HEIGHT } from "../story-card-styles";

/**
 * Fixed brand palette for the story card. This PNG is a brand artifact seen
 * on Instagram, outside the app, so its colours never read from the device
 * theme via `useUnistyles` — they are the same regardless of what theme the
 * sharer has picked.
 */
export const BRAND_PINK = "hsl(333, 81%, 66%)";
export const BRAND_GRADIENT = ["#FF81BD", "#FB6E90", "#DC5791"] as const;
export const INK = "#0F172A";
export const CREAM = "#FFF9FB";
export const WHITE = "#FFFFFF";

/** Backdrop for photo-less fallback panels — a muted step off `BRAND_PINK`. */
export const PHOTO_FALLBACK_COLOR = "hsl(333, 42%, 64%)";

/**
 * A moodier take on `BRAND_GRADIENT` that runs from a barely-there blush
 * down to a near-black plum, for full-bleed backdrops that need to hold
 * white text legible at the bottom without a separate scrim.
 */
export const STAGE_GRADIENT = ["#FFE3EF", "#FB6E90", "#3A0F27"] as const;

/**
 * Instagram stories reserve roughly the top and bottom 250px of a 1080x1920
 * frame for their own chrome (profile row up top, reply bar at the bottom).
 * The card is captured at 360x640 (a 3x scale down from the exported PNG),
 * so that reserved band is ~83px here — every variant keeps meaningful text
 * and the brand mark inside `SAFE_TOP`..`SAFE_BOTTOM`. Photos are allowed to
 * bleed past it to the card's physical edges.
 */
export const SAFE_TOP = 85;
export const SAFE_BOTTOM = 555;
export const SAFE_BOTTOM_INSET = CARD_HEIGHT - SAFE_BOTTOM;

/** `Logo`'s natural aspect ratio (from its `534 635` viewBox), height/width. */
export const PAW_ASPECT = 635 / 534;
