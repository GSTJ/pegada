import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { WHITE } from "../constants";
import { pickByGender } from "../gender";
import {
  BrandFooter,
  Chip,
  PhotoOrFallback,
  SafeArea,
  SafeMiddle,
} from "../primitives";

type Cell = { left: number; top: number; width: number; height: number };

const GRID_GAP = 8;

/** Photo count -> cell rectangles inside a `width` x `height` box. */
const layoutGrid = (count: number, width: number, height: number): Cell[] => {
  if (count <= 1) return [{ left: 0, top: 0, width, height }];

  if (count === 2) {
    const w = (width - GRID_GAP) / 2;
    return [
      { left: 0, top: 0, width: w, height },
      { left: w + GRID_GAP, top: 0, width: w, height },
    ];
  }

  if (count === 3) {
    const bigWidth = width * 0.6 - GRID_GAP / 2;
    const smallWidth = width - bigWidth - GRID_GAP;
    const smallHeight = (height - GRID_GAP) / 2;
    return [
      { left: 0, top: 0, width: bigWidth, height },
      {
        left: bigWidth + GRID_GAP,
        top: 0,
        width: smallWidth,
        height: smallHeight,
      },
      {
        left: bigWidth + GRID_GAP,
        top: smallHeight + GRID_GAP,
        width: smallWidth,
        height: smallHeight,
      },
    ];
  }

  const w = (width - GRID_GAP) / 2;
  const h = (height - GRID_GAP) / 2;
  return [
    { left: 0, top: 0, width: w, height: h },
    { left: w + GRID_GAP, top: 0, width: w, height: h },
    { left: 0, top: h + GRID_GAP, width: w, height: h },
    { left: w + GRID_GAP, top: h + GRID_GAP, width: w, height: h },
  ];
};

const GRID_WIDTH = 308;
const GRID_HEIGHT = 300;

/**
 * "Rex, 3" up top like a dating profile, then a photo grid that scales
 * from one big frame to a 2x2 wall depending on how many photos the dog
 * has — the "Tinder pra cachorro" read without ever saying the word.
 */
export const DatingProfileVariant = ({
  images,
  name,
  breedName,
  ageYears,
  gender,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();
  const status = t(
    pickByGender(
      gender,
      "dogShare.story.statusMale",
      "dogShare.story.statusFemale",
    ),
  );
  const cells = layoutGrid(images.length, GRID_WIDTH, GRID_HEIGHT);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1B0B14", "#3A0F27"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.backdrop}
      />

      <SafeArea>
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontWeight="black"
            style={styles.name}
          >
            {ageYears === undefined ? name : `${name}, ${ageYears}`}
          </Text>
          <View style={styles.chipRow}>
            <Chip tone="outline">{status}</Chip>
            {breedName ? <Chip tone="outline">{breedName}</Chip> : null}
          </View>
        </View>

        <SafeMiddle style={styles.middle}>
          <View style={styles.grid}>
            {cells.map((cell, index) => (
              <PhotoOrFallback
                // eslint-disable-next-line react/no-array-index-key -- cells are positional and never reorder within a single render
                key={index}
                photo={images[index]}
                onSettle={onImageSettled}
                style={[styles.cell, cell]}
              />
            ))}
          </View>
          <Text fontWeight="semibold" style={styles.lookingFor}>
            {t("dogShare.story.lookingFor")}
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
  header: { gap: 10 },
  name: {
    fontSize: 34,
    color: WHITE,
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  middle: { alignItems: "center", gap: 14 },
  grid: { width: GRID_WIDTH, height: GRID_HEIGHT },
  cell: { position: "absolute", borderRadius: 16, overflow: "hidden" },
  lookingFor: {
    fontSize: 14.5,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },
}));
