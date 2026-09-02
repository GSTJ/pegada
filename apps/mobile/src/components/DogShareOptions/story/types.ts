import type { ShareableDog } from "../types";
import type { StoryPhotoPlan } from "./photos";

/** One entry of `ShareableDog["images"]` — kept as an alias so variants and
 * primitives don't reach into the array type by hand. */
export type StoryPhoto = ShareableDog["images"][number];

/**
 * Props every story variant receives.
 *
 * `plan` is built in `../story-card.tsx` by `planStoryPhotos` (`./photos.ts`)
 * and already answers "which photo goes where" for this dog and this
 * composition, including the no-photo case (`plan.isEmpty`). A variant reads
 * slots off it rather than slicing `dog.images` itself, which is what keeps
 * the layout-at-N-photos decisions in a module a unit test can reach.
 */
export type StoryVariantProps = {
  dog: ShareableDog;
  plan: StoryPhotoPlan;
  name: string;
  gender: string;
  /**
   * Call once per photo slot the variant renders (via `StoryImage`'s
   * `onSettle`), whether it loaded, failed, or never had a URL to begin
   * with. `story-card.tsx` aggregates these into the single `onPhotoSettled`
   * the sheet already knows about.
   */
  onImageSettled: () => void;
};
