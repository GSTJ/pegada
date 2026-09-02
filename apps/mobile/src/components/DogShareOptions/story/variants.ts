import type { StoryVariantProps } from "./types";

import type { ComponentType } from "react";

import { DatingProfileVariant } from "./variants/dating-profile";
import { PolaroidStackVariant } from "./variants/polaroid-stack";
import { SpeechBubbleVariant } from "./variants/speech-bubble";
import { SwipeCardVariant } from "./variants/swipe-card";
import { TradingCardVariant } from "./variants/trading-card";
import { WantedPosterVariant } from "./variants/wanted-poster";

export type StoryVariantId =
  | "swipeCard"
  | "speechBubble"
  | "polaroidStack"
  | "datingProfile"
  | "tradingCard"
  | "wantedPoster";

type StoryVariantDefinition = {
  Component: ComponentType<StoryVariantProps>;
  /**
   * The most photos this layout will ever put an `Image` in. `story-card.tsx`
   * slices `dog.images` down to `max(1, min(dog.images.length, maxPhotos))`
   * before handing them to the variant, so it always renders exactly that
   * many `PhotoOrFallback` slots — the floor of 1 is what makes the
   * no-photo fallback panel show up even for variants built around a photo
   * grid.
   */
  maxPhotos: number;
};

/**
 * The full set of story compositions. Order here is display order for a
 * future variant picker in the share sheet — not otherwise meaningful.
 */
export const STORY_VARIANTS: Record<StoryVariantId, StoryVariantDefinition> = {
  swipeCard: { Component: SwipeCardVariant, maxPhotos: 2 },
  speechBubble: { Component: SpeechBubbleVariant, maxPhotos: 1 },
  polaroidStack: { Component: PolaroidStackVariant, maxPhotos: 3 },
  datingProfile: { Component: DatingProfileVariant, maxPhotos: 4 },
  tradingCard: { Component: TradingCardVariant, maxPhotos: 1 },
  wantedPoster: { Component: WantedPosterVariant, maxPhotos: 1 },
};

/**
 * The pick that ships as the default render — see the report handed back
 * alongside this change for why: it is the one composition that both
 * explains the app to someone who has never heard of it and stages the
 * dog's own photo as the hero, not a design chrome.
 */
export const DEFAULT_STORY_VARIANT: StoryVariantId = "swipeCard";
