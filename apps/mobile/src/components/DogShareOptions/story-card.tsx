import type { ShareableDog } from "./types";
import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import { forwardRef, type ComponentRef } from "react";
import { View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { useTranslation } from "react-i18next";

import Logo from "@/assets/images/logo";
import { Image } from "@/components/image";
import { Text } from "@/components/text";
import { useGetFormattedYears } from "@/services/use-get-formatted-years";

import { GROUND_GRADIENT, styles } from "./story-card-styles";

const BRAND_MARK_COLOR = "#FFFFFF";

type DogStoryCardProps = {
  dog: ShareableDog;
  /**
   * Fires once the photo has settled — loaded or failed, either way — so the
   * sheet knows when it is safe to capture instead of racing a still-loading
   * network image. No-op when there is no photo, since nothing to wait for.
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
>(({ dog, onPhotoSettled }, ref) => {
  const { t } = useTranslation(Namespace.Breed);
  const getFormattedYears = useGetFormattedYears();

  const [photo] = dog.images;
  const breedName = dog.breed?.slug
    ? t(dog.breed.slug as BreedSlug)
    : undefined;
  const age = dog.birthDate ? getFormattedYears(dog.birthDate) : undefined;
  const subtitle = [breedName, age].filter(Boolean).join("  •  ");

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <LinearGradient
        colors={GROUND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ground}
      />
      <View style={styles.photoSlot}>
        {photo?.url ? (
          <Image
            source={{ uri: photo.url, blurhash: photo.blurhash ?? undefined }}
            style={styles.photo}
            contentFit="cover"
            transition={0}
            onLoadEnd={onPhotoSettled}
          />
        ) : (
          <View style={styles.photoFallback}>
            <Logo
              width={64}
              height={76}
              colorStopOne={BRAND_MARK_COLOR}
              colorStopTwo={BRAND_MARK_COLOR}
            />
          </View>
        )}
      </View>
      <View style={styles.textBlock}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          fontWeight="black"
          style={styles.name}
        >
          {dog.name}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontWeight="medium"
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.brandRow}>
        <Logo
          width={20}
          height={24}
          colorStopOne={BRAND_MARK_COLOR}
          colorStopTwo={BRAND_MARK_COLOR}
        />
        <Text fontWeight="semibold" style={styles.brandText}>
          pegada.app
        </Text>
      </View>
    </View>
  );
});

DogStoryCard.displayName = "DogStoryCard";
