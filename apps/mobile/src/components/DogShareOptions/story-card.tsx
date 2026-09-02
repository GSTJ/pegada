import type { ShareableDog } from "./types";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentRef,
} from "react";
import { View } from "react-native";

import { styles } from "./story-card-styles";
import { planStoryPhotos } from "./story/photos";
import {
  DEFAULT_STORY_VARIANT,
  STORY_VARIANTS,
  type StoryVariantId,
} from "./story/variants";

/** How long to wait for photos before capturing anyway — a slow network
 * shouldn't hang the share sheet forever. Exported so `index.tsx`'s
 * `waitForPhoto` can wait at least this long before giving up itself; it
 * would be pointless for the sheet to abandon the wait before the card's
 * own timeout has even had a chance to fire `onPhotoSettled`. */
export const STORY_SETTLE_TIMEOUT_MS = 4000;

type DogStoryCardProps = {
  dog: ShareableDog;
  /**
   * Which composition to render. Defaults to the pick in
   * `story/variants.ts` so existing call sites need no changes; a future
   * variant picker in the share sheet can pass this through without
   * touching the card itself.
   */
  variant?: StoryVariantId;
  /**
   * Fires once every photo the chosen variant renders has settled —
   * loaded, failed, or (for a dog with fewer photos than the variant
   * wants) never had a URL to begin with — so the sheet knows when it is
   * safe to capture instead of racing a still-loading network image. Also
   * fires after `STORY_SETTLE_TIMEOUT_MS` regardless, so a slow network
   * can't hang the share sheet forever.
   */
  onPhotoSettled?: () => void;
};

/**
 * The 9:16 card rendered offscreen and captured for the story share.
 *
 * `collapsable={false}` on the root is load-bearing: without it the native
 * view hierarchy is free to flatten this node away since it paints nothing
 * interactive, and `captureRef` would then have no view to read.
 */
export const DogStoryCard = forwardRef<
  ComponentRef<typeof View>,
  DogStoryCardProps
>(({ dog, variant = DEFAULT_STORY_VARIANT, onPhotoSettled }, ref) => {
  const variantDef = STORY_VARIANTS[variant];
  const plan = planStoryPhotos(dog.images, variant);
  // At least one settle even for a dog with no photos: the branded fallback
  // panel reports itself settled on mount, so the floor keeps the aggregation
  // below from waiting on a count of zero that can never be reached.
  const photoCount = Math.max(1, plan.slots.length);

  const settledCountRef = useRef(0);
  const reportedRef = useRef(false);

  const fireSettled = useCallback(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    onPhotoSettled?.();
  }, [onPhotoSettled]);

  const reportImageSettled = useCallback(() => {
    settledCountRef.current += 1;
    if (settledCountRef.current >= photoCount) fireSettled();
  }, [photoCount, fireSettled]);

  // Reset the aggregation whenever the underlying data this card is built
  // from actually changes, so a re-render for a different dog or variant
  // doesn't inherit a stale "already reported" flag.
  useEffect(() => {
    settledCountRef.current = 0;
    reportedRef.current = false;
  }, [dog.id, variant]);

  useEffect(() => {
    const timer = setTimeout(fireSettled, STORY_SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fireSettled]);

  const Variant = variantDef.Component;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Variant
        dog={dog}
        plan={plan}
        name={dog.name}
        gender={dog.gender}
        onImageSettled={reportImageSettled}
      />
    </View>
  );
});

DogStoryCard.displayName = "DogStoryCard";
