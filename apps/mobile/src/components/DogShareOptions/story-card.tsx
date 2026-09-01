import type { ShareableDog } from "./types";
import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentRef,
} from "react";
import { View } from "react-native";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { differenceInYears } from "date-fns/differenceInYears";
import { useTranslation } from "react-i18next";

import { useGetFormattedYears } from "@/services/use-get-formatted-years";

import { styles } from "./story-card-styles";
import {
  DEFAULT_STORY_VARIANT,
  STORY_VARIANTS,
  type StoryVariantId,
} from "./story/variants";

/** How long to wait for photos before capturing anyway — a slow network
 * shouldn't hang the share sheet forever. */
const SETTLE_TIMEOUT_MS = 4000;

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
   * fires after `SETTLE_TIMEOUT_MS` regardless, so a slow network can't
   * hang the share sheet forever.
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
  const { t } = useTranslation(Namespace.Breed);
  const getFormattedYears = useGetFormattedYears();

  const variantDef = STORY_VARIANTS[variant];
  // At least one slot even for a dog with no photos, so every layout still
  // shows its branded fallback panel instead of collapsing.
  const photoCount = Math.max(
    1,
    Math.min(dog.images.length, variantDef.maxPhotos),
  );
  const images = Array.from(
    { length: photoCount },
    (_, index) => dog.images[index],
  );

  const breedName = dog.breed?.slug
    ? t(dog.breed.slug as BreedSlug)
    : undefined;
  const age = dog.birthDate ? getFormattedYears(dog.birthDate) : undefined;
  const ageYears = dog.birthDate
    ? differenceInYears(new Date(), new Date(dog.birthDate))
    : undefined;

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
    const timer = setTimeout(fireSettled, SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fireSettled]);

  const Variant = variantDef.Component;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Variant
        dog={dog}
        images={images}
        name={dog.name}
        breedName={breedName}
        age={age}
        ageYears={ageYears}
        gender={dog.gender}
        onImageSettled={reportImageSettled}
      />
    </View>
  );
});

DogStoryCard.displayName = "DogStoryCard";
