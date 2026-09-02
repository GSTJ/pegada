import type { StoryVariantProps } from "./types";

import type { ComponentType } from "react";

import { STORY_MAX_PHOTOS } from "./photos";
import { DmAbertaVariant } from "./variants/dm-aberta";
import { RoleTicketVariant } from "./variants/role-ticket";

export type StoryVariantId = "dm-aberta" | "role-ticket";

type StoryVariantDefinition = {
  Component: ComponentType<StoryVariantProps>;
  /**
   * The most photos this layout will ever put an `Image` in. `photos.ts`
   * caps the dog's image list at this before assigning slots, so a dog with
   * more photos than the composition has room for drops the tail rather than
   * silently reflowing the layout.
   */
  maxPhotos: number;
};

/**
 * The full set of story compositions, both built from the approved concept
 * art. Order here is display order for a future variant picker in the share
 * sheet — not otherwise meaningful.
 */
export const STORY_VARIANTS: Record<StoryVariantId, StoryVariantDefinition> = {
  "dm-aberta": {
    Component: DmAbertaVariant,
    maxPhotos: STORY_MAX_PHOTOS["dm-aberta"],
  },
  "role-ticket": {
    Component: RoleTicketVariant,
    maxPhotos: STORY_MAX_PHOTOS["role-ticket"],
  },
};

/**
 * The pick that ships as the default render: "DM aberta" leads with the
 * dog's own photo at bubble size and states what the app is in the headline,
 * so a viewer who has never heard of Pegada can read the whole idea off the
 * image alone.
 */
export const DEFAULT_STORY_VARIANT: StoryVariantId = "dm-aberta";
