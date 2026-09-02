import type { StoryPhoto } from "./types";
import type { StoryVariantId } from "./variants";

/**
 * How many photos each composition has room for. It lives here rather than
 * in `variants.ts` so this module stays free of any runtime import from the
 * registry — the registry pulls in both variant components, and those import
 * this planner back, which would be a cycle. `variants.ts` re-exposes these
 * as each definition's `maxPhotos`.
 */
export const STORY_MAX_PHOTOS: Record<StoryVariantId, number> = {
  "dm-aberta": 4,
  "role-ticket": 4,
};

/**
 * A rectangle expressed as fractions (0..1) of whatever region the slot
 * belongs to, so the arithmetic is resolution independent and testable
 * without laying anything out: the variant multiplies it by its own region
 * box at render time.
 */
export type StoryPhotoRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Where in a composition a photo lands.
 *
 * - `mosaic` — inside the variant's main photo frame (the DM bubble, the
 *   ticket's photo band). Several photos share it, tiled by `rect`.
 * - `stamp` — the small tilted print stuck on top of the composition. Only
 *   the ticket uses it, and only once it has a third photo to spare.
 */
export type StoryPhotoRegion = "mosaic" | "stamp";

export type StoryPhotoSlot = {
  /** Index in the dog's original image list. Order is always preserved. */
  index: number;
  photo: StoryPhoto;
  region: StoryPhotoRegion;
  rect: StoryPhotoRect;
  /** Degrees of tilt. Zero inside a clipped frame, non-zero for stamps. */
  rotate: number;
};

export type StoryPhotoPlan = {
  variant: StoryVariantId;
  slots: StoryPhotoSlot[];
  /** How many photos the mosaic frame is tiled for — 0 means the fallback. */
  mosaicCount: number;
  /** No usable photo at all: the variant paints its branded fallback. */
  isEmpty: boolean;
};

const FULL: StoryPhotoRect = { x: 0, y: 0, width: 1, height: 1 };

/**
 * How the DM bubble's photo frame is tiled at each count. One photo fills it;
 * the rest split it into deliberately uneven panes so two, three or four
 * photos each read as a composed collage rather than the same grid with
 * empty cells. Gutters are added at render time as a margin on each pane, so
 * these tile edge to edge.
 */
const DM_MOSAIC: StoryPhotoRect[][] = [
  [FULL],
  [
    { x: 0, y: 0, width: 0.56, height: 1 },
    { x: 0.56, y: 0, width: 0.44, height: 1 },
  ],
  [
    { x: 0, y: 0, width: 0.56, height: 1 },
    { x: 0.56, y: 0, width: 0.44, height: 0.52 },
    { x: 0.56, y: 0.52, width: 0.44, height: 0.48 },
  ],
  // A pinwheel rather than a plain quarters grid: the two column splits are
  // offset from each other so the eye reads a layout, not a contact sheet.
  [
    { x: 0, y: 0, width: 0.52, height: 0.55 },
    { x: 0.52, y: 0, width: 0.48, height: 0.55 },
    { x: 0, y: 0.55, width: 0.44, height: 0.45 },
    { x: 0.44, y: 0.55, width: 0.56, height: 0.45 },
  ],
];

/**
 * The ticket's photo band. The concept pairs one tall hero with a narrower
 * portrait beside it; a lone photo takes the whole band instead of leaving a
 * hole, and a fourth splits the narrow column in two. Anything past the
 * second photo that does not fit the band goes to the `stamp` slot below.
 */
const TICKET_BAND: StoryPhotoRect[][] = [
  [FULL],
  [
    { x: 0, y: 0, width: 0.6, height: 1 },
    { x: 0.6, y: 0, width: 0.4, height: 1 },
  ],
  [
    { x: 0, y: 0, width: 0.6, height: 1 },
    { x: 0.6, y: 0, width: 0.4, height: 1 },
  ],
  [
    { x: 0, y: 0, width: 0.6, height: 1 },
    { x: 0.6, y: 0, width: 0.4, height: 0.52 },
    { x: 0.6, y: 0.52, width: 0.4, height: 0.48 },
  ],
];

/** The tilt on the ticket's stamp print, in degrees. */
const STAMP_ROTATE = 4;

/** Drops photos with no usable URL so a broken record can't blank a pane. */
const usablePhotos = (photos: readonly (StoryPhoto | undefined)[]) =>
  photos.filter((photo): photo is StoryPhoto => Boolean(photo?.url));

/** The tiling for `count` photos, clamped to what the table actually has. */
const tilesFor = (table: StoryPhotoRect[][], count: number): StoryPhotoRect[] =>
  table[Math.min(Math.max(count, 1), table.length) - 1] ?? [FULL];

/**
 * Assigns a dog's photos to a variant's layout slots.
 *
 * Pure and deterministic: same photos in, same slots out, with the original
 * order preserved and the list capped at the variant's `maxPhotos`. Variants
 * render straight off the returned slots, which is what keeps the "does it
 * look intentional at 1, 2, 3 and 4 photos" decision here — unit testable —
 * instead of inside a component that only a screenshot can check.
 */
export const planStoryPhotos = (
  photos: readonly (StoryPhoto | undefined)[],
  variant: StoryVariantId,
): StoryPhotoPlan => {
  const usable = usablePhotos(photos).slice(0, STORY_MAX_PHOTOS[variant]);

  if (usable.length === 0) {
    return { variant, slots: [], mosaicCount: 0, isEmpty: true };
  }

  if (variant === "dm-aberta") {
    const rects = tilesFor(DM_MOSAIC, usable.length);
    return {
      variant,
      mosaicCount: usable.length,
      isEmpty: false,
      slots: usable.map((photo, index) => ({
        index,
        photo,
        region: "mosaic" as const,
        rect: rects[index] ?? FULL,
        rotate: 0,
      })),
    };
  }

  // Ticket: the band takes at most two of the first photos, and every photo
  // past what the band tiles becomes the stamp print.
  const bandRects = tilesFor(TICKET_BAND, usable.length);
  const bandCount = bandRects.length;

  return {
    variant,
    mosaicCount: bandCount,
    isEmpty: false,
    slots: usable.map((photo, index) =>
      index < bandCount
        ? {
            index,
            photo,
            region: "mosaic" as const,
            rect: bandRects[index] ?? FULL,
            rotate: 0,
          }
        : {
            index,
            photo,
            region: "stamp" as const,
            rect: FULL,
            rotate: STAMP_ROTATE,
          },
    ),
  };
};

/** The slots that tile the variant's main photo frame, in layout order. */
export const mosaicSlots = (plan: StoryPhotoPlan) =>
  plan.slots.filter((slot) => slot.region === "mosaic");

/** The tilted print stuck on the composition, if this plan has one. */
export const stampSlot = (plan: StoryPhotoPlan) =>
  plan.slots.find((slot) => slot.region === "stamp");
