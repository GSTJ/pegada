import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { BRAND_PINK, INK, STAGE_GRADIENT, WHITE } from "../constants";
import { pickByGender } from "../gender";
import {
  BrandFooter,
  PawMark,
  PhotoOrFallback,
  SafeArea,
  SafeMiddle,
} from "../primitives";

const StatBar = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statRow}>
    <Text fontWeight="bold" style={styles.statLabel}>
      {label}
    </Text>
    <View style={styles.statTrack}>
      <View style={[styles.statFill, { width: `${value}%` }]} />
    </View>
  </View>
);

/**
 * A collector's trading card: a bordered frame, a "limited edition" ribbon,
 * and playful stat bars instead of the usual name-plus-caption layout. The
 * format itself is the joke — dogs as pull cards you'd want a full set of.
 */
export const TradingCardVariant = ({
  images,
  name,
  breedName,
  gender,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();
  const [photo] = images;
  const status = t(
    pickByGender(
      gender,
      "dogShare.story.statusMale",
      "dogShare.story.statusFemale",
    ),
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={STAGE_GRADIENT}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.backdrop}
      />
      <PawMark
        size={150}
        color={WHITE}
        opacity={0.07}
        style={styles.watermark}
      />

      <SafeArea>
        <SafeMiddle style={styles.middle}>
          <View style={styles.card}>
            <View style={styles.ribbon}>
              <Text fontWeight="bold" style={styles.ribbonText}>
                {t("dogShare.story.tradingCard.edition")}
              </Text>
            </View>

            <View style={styles.photoFrame}>
              <PhotoOrFallback
                photo={photo}
                onSettle={onImageSettled}
                style={styles.photo}
                fallbackIconSize={56}
              />
            </View>

            <View style={styles.nameRow}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                fontWeight="black"
                style={styles.name}
              >
                {name}
              </Text>
            </View>
            {breedName ? (
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.breed}>
                {breedName}
              </Text>
            ) : null}

            <View style={styles.stats}>
              <StatBar
                label={t("dogShare.story.tradingCard.statSniff")}
                value={100}
              />
              <StatBar
                label={t("dogShare.story.tradingCard.statCuteness")}
                value={100}
              />
              <View style={styles.statRow}>
                <Text fontWeight="bold" style={styles.statLabel}>
                  {t("dogShare.story.tradingCard.statStatus")}
                </Text>
                <Text fontWeight="semibold" style={styles.statValue}>
                  {status}
                </Text>
              </View>
            </View>
          </View>

          <Text numberOfLines={1} fontWeight="semibold" style={styles.collect}>
            {t("dogShare.story.tradingCard.collect")}
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
  watermark: { position: "absolute", bottom: -18, right: -18 },
  middle: { alignItems: "center", gap: 14 },
  card: {
    width: 268,
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: BRAND_PINK,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    alignItems: "center",
    gap: 8,
  },
  ribbon: {
    backgroundColor: INK,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ribbonText: {
    fontSize: 10,
    letterSpacing: 1,
    color: WHITE,
    textTransform: "uppercase",
  },
  photoFrame: {
    width: "100%",
    height: 190,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  photo: { flex: 1 },
  nameRow: { alignSelf: "stretch" },
  name: { fontSize: 22, color: INK, textAlign: "center" },
  breed: { fontSize: 13, color: "rgba(15, 23, 42, 0.55)", textAlign: "center" },
  stats: { alignSelf: "stretch", marginTop: 6, gap: 7 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statLabel: {
    width: 68,
    fontSize: 11,
    color: "rgba(15, 23, 42, 0.65)",
    textTransform: "uppercase",
  },
  statTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(220, 87, 145, 0.16)",
    overflow: "hidden",
  },
  statFill: { height: 6, borderRadius: 3, backgroundColor: BRAND_PINK },
  statValue: { fontSize: 12, color: INK },
  collect: { fontSize: 13, color: "rgba(255, 255, 255, 0.85)" },
}));
