import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { BRAND_PINK, CREAM, INK } from "../constants";
import { pickByGender } from "../gender";
import {
  BrandFooter,
  PhotoOrFallback,
  SafeArea,
  SafeMiddle,
} from "../primitives";

/**
 * A modern, restrained take on "procura-se" — bold type and a plain
 * cream field rather than any faux-parchment texture, so it reads as a
 * poster rather than a cheap clip-art gag.
 */
export const WantedPosterVariant = ({
  images,
  name,
  gender,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();
  const [photo] = images;
  const subhead = t(
    pickByGender(
      gender,
      "dogShare.story.wanted.subheadMale",
      "dogShare.story.wanted.subheadFemale",
    ),
    { name },
  );

  return (
    <View style={styles.root}>
      <SafeArea>
        <View style={styles.headlineBlock}>
          <Text numberOfLines={1} fontWeight="black" style={styles.headline}>
            {t("dogShare.story.wanted.headline")}
          </Text>
          <View style={styles.rule} />
        </View>

        <SafeMiddle style={styles.middle}>
          <View style={styles.frame}>
            <PhotoOrFallback
              photo={photo}
              onSettle={onImageSettled}
              style={styles.photo}
              fallbackIconSize={64}
            />
          </View>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            fontWeight="bold"
            style={styles.subhead}
          >
            {subhead}
          </Text>
          <Text numberOfLines={1} fontWeight="semibold" style={styles.reward}>
            {t("dogShare.story.wanted.reward")}
          </Text>
        </SafeMiddle>

        <BrandFooter tone="dark" />
      </SafeArea>
    </View>
  );
};

const styles = StyleSheet.create(() => ({
  root: { flex: 1, backgroundColor: CREAM },
  headlineBlock: { alignItems: "center", gap: 8 },
  headline: {
    fontSize: 40,
    letterSpacing: 3,
    color: INK,
    textTransform: "uppercase",
  },
  rule: { width: 64, height: 4, borderRadius: 2, backgroundColor: BRAND_PINK },
  middle: { alignItems: "center", gap: 14 },
  frame: {
    width: 268,
    height: 268,
    borderRadius: 18,
    borderWidth: 5,
    borderColor: INK,
    overflow: "hidden",
  },
  photo: { flex: 1 },
  subhead: {
    fontSize: 19,
    color: INK,
    textAlign: "center",
    paddingHorizontal: 12,
    textTransform: "uppercase",
  },
  reward: { fontSize: 14, color: BRAND_PINK, textAlign: "center" },
}));
