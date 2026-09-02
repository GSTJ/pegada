import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { INK, STAGE_GRADIENT, WHITE } from "../constants";
import { pickByGender } from "../gender";
import {
  BottomScrim,
  BrandFooter,
  Chip,
  PawMark,
  PhotoOrFallback,
  SafeArea,
  SafeMiddle,
} from "../primitives";

/**
 * "Tá no Pegada" — the app's own swipe card, life-size, staged like a
 * product shot: a second card peeking out from behind gives it the
 * stacked-deck read — the dog's own next photo for a dog with more than
 * one, or a blank card for a dog with just the one so nothing fakes a
 * second photo that doesn't exist. This is the "meu dog tá no Tinder de
 * cachorro" joke made literal, and the one that explains the app fastest to
 * someone who has never heard of it.
 */
export const SwipeCardVariant = ({
  dog,
  images,
  name,
  breedName,
  ageYears,
  gender,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();
  const [photo, backPhoto] = images;

  const title = t("dogShare.story.swipeCard.headline", { name });
  const cta = t(
    pickByGender(
      gender,
      "dogShare.story.swipeCard.ctaMale",
      "dogShare.story.swipeCard.ctaFemale",
    ),
    { name },
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={STAGE_GRADIENT}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.backdrop}
      />
      <SafeArea>
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          fontWeight="black"
          style={styles.headline}
        >
          {title}
        </Text>
        <Text fontWeight="semibold" style={styles.tagline}>
          {t("dogShare.story.appTagline")}
        </Text>

        <SafeMiddle style={styles.middle}>
          <View style={styles.stack}>
            {backPhoto ? (
              <View style={styles.stackBackPhoto}>
                <PhotoOrFallback
                  photo={backPhoto}
                  onSettle={onImageSettled}
                  style={styles.stackBackPhotoImage}
                />
                <View style={styles.stackBackScrim} />
              </View>
            ) : (
              <View style={styles.stackBack} />
            )}
            <View style={styles.stackCard}>
              <PhotoOrFallback
                photo={photo}
                onSettle={onImageSettled}
                style={styles.stackPhoto}
              />
              <View style={styles.dotsRow}>
                {dog.images.slice(0, 5).map((image, index) => (
                  <View
                    key={image.url}
                    style={[styles.dot, index === 0 && styles.dotActive]}
                  />
                ))}
              </View>
              <BottomScrim height={110} />
              <View style={styles.stackFooter}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  fontWeight="black"
                  style={styles.stackName}
                >
                  {ageYears === undefined ? name : `${name}, ${ageYears}`}
                </Text>
                {breedName ? (
                  <Chip tone="outline" style={styles.stackChip}>
                    {breedName}
                  </Chip>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <View style={[styles.actionButton, styles.actionButtonPass]}>
              <Text fontWeight="black" style={styles.actionGlyphPass}>
                ✕
              </Text>
            </View>
            <View style={[styles.actionButton, styles.actionButtonLike]}>
              <PawMark size={22} color={WHITE} />
            </View>
          </View>
          <Text numberOfLines={1} fontWeight="bold" style={styles.cta}>
            {cta}
          </Text>
        </SafeMiddle>

        <BrandFooter tone="light" />
      </SafeArea>
    </View>
  );
};

const styles = StyleSheet.create(() => ({
  root: { flex: 1 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  headline: {
    fontSize: 28,
    lineHeight: 32,
    color: WHITE,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },
  middle: {
    alignItems: "center",
    gap: 14,
  },
  stack: {
    width: 226,
    height: 236,
    alignItems: "center",
    justifyContent: "center",
  },
  stackBack: {
    position: "absolute",
    width: 208,
    height: 224,
    borderRadius: 24,
    backgroundColor: "rgba(255, 249, 251, 0.9)",
    transform: [{ rotate: "6deg" }],
  },
  stackBackPhoto: {
    position: "absolute",
    width: 208,
    height: 224,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: INK,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.75)",
    transform: [{ rotate: "6deg" }],
  },
  stackBackPhotoImage: { flex: 1 },
  stackBackScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(58, 15, 39, 0.5)",
  },
  stackCard: {
    width: 214,
    height: 236,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: INK,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.9)",
    transform: [{ rotate: "-3deg" }],
  },
  stackPhoto: { flex: 1 },
  dotsRow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  dotActive: { backgroundColor: WHITE },
  stackFooter: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
    gap: 6,
  },
  stackName: { fontSize: 19, color: WHITE },
  stackChip: { alignSelf: "flex-start" },
  actionsRow: {
    flexDirection: "row",
    gap: 26,
    alignItems: "center",
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  actionButtonPass: { backgroundColor: WHITE },
  actionButtonLike: { backgroundColor: "#DC5791" },
  actionGlyphPass: { fontSize: 20, color: INK },
  cta: { fontSize: 13.5, color: "rgba(255, 255, 255, 0.9)" },
}));
