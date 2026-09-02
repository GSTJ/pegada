/**
 * Fixed palettes for the two story compositions. This PNG is a brand artifact
 * seen on Instagram, outside the app, so its colours never read from the
 * device theme via `useUnistyles` — they are the same regardless of what
 * theme the sharer has picked.
 *
 * Both palettes are lifted verbatim from the approved concept art
 * (`06-dm-aberta` and `02-role-ticket`) so the shipped card and the concept
 * renders are the same artwork.
 */

/** Shared across both compositions: everything is drawn in hard black line. */
export const INK = "#111111";
export const WHITE = "#FFFFFF";

/** Concept 06, "DM aberta": acid yellow paper, teal checker, pink marker. */
export const DM = {
  paper: "#F4E55D",
  checker: "#31C7BD",
  edge: "#EF62A1",
  lime: "#D6FB43",
  bubbleTeal: "#31C7BD",
  bubblePink: "#EF62A1",
  ctaPink: "#D7377C",
} as const;

/** Concept 02, "Rolê ticket": navy stock, cream stub, yellow rail. */
export const TICKET = {
  navy: "#162348",
  cream: "#F1EAD8",
  dot: "#F0E7D2",
  stripePink: "#EF62A1",
  stripeYellow: "#F7D34C",
  rail: "#F7D34C",
} as const;

/**
 * Instagram stories reserve roughly the top and bottom 250px of a 1080x1920
 * frame for their own chrome (profile row up top, reply bar at the bottom).
 * The card is laid out at 360x640 (a 3x scale down from the exported PNG),
 * so that reserved band is ~83pt here: both variants keep every piece of
 * meaningful content between y=85 and y=555, and only background texture
 * (the checker column, the dot field, the navy stock) bleeds past it to the
 * card's physical edges. The offsets that honour this are the concept's own,
 * divided by three, so they are written literally in each variant rather
 * than derived from a token.
 */

/** `Logo`'s natural aspect ratio (from its `534 635` viewBox), height/width. */
export const PAW_ASPECT = 635 / 534;

/**
 * The concepts are typeset in a wide grotesque the app does not bundle. The
 * app ships Gilroy only (`Font` in `@pegada/shared/themes/themes`), so the
 * editorial weight of the concept headlines is approximated with Gilroy
 * ExtraBold (`fontWeight="black"` on `@/components/text`) at negative
 * tracking and sub-1 leading; eyebrows and rails get SemiBold/Bold uppercase
 * at wide positive tracking. These are the two ends of that scale, kept here
 * so both variants tighten by the same amount.
 */
export const DISPLAY_TRACKING = -1.6;
export const EYEBROW_TRACKING = 1.1;
