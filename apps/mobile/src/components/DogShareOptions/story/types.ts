import type { ShareableDog } from "../types";

/** One entry of `ShareableDog["images"]` — kept as an alias so variants and
 * primitives don't reach into the array type by hand. */
export type StoryPhoto = ShareableDog["images"][number];

/**
 * Props every story variant receives. `images` is always exactly as long as
 * that variant declared it needs via `maxPhotos` in `../variants.ts` — see
 * `buildImageSlots` in `../story-card.tsx` — with `undefined` standing in
 * for a slot the dog doesn't have a photo for, so a variant can always map
 * over it and let `PhotoOrFallback` render the branded placeholder for the
 * gaps instead of branching on length itself.
 */
export type StoryVariantProps = {
  dog: ShareableDog;
  images: (StoryPhoto | undefined)[];
  name: string;
  breedName?: string;
  /** Localised, e.g. "3 anos" or "1 year and 2 months" — for prose. */
  age?: string;
  /** Whole years, e.g. `3` — for compact "Rex, 3" style headers. */
  ageYears?: number;
  gender: string;
  /**
   * Call once per photo slot the variant renders (via `PhotoOrFallback`'s
   * `onSettle`), whether it loaded, failed, or never had a URL to begin
   * with. `story-card.tsx` aggregates these into the single `onPhotoSettled`
   * the sheet already knows about.
   */
  onImageSettled: () => void;
};
