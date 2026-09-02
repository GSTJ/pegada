import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { INK } from "../constants";
import { pickByGender } from "../gender";
import {
  BrandFooter,
  PolaroidFrame,
  SafeArea,
  SafeMiddle,
} from "../primitives";

/**
 * Two or three photos fanned out as tilted instant prints, with a caption
 * under the front one. Degrades to a single straight print for a one-photo
 * dog rather than faking a fan out of nothing.
 */
export const PolaroidStackVariant = ({
  images,
  name,
  breedName,
  age,
  gender,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();
  const kicker = t(
    pickByGender(
      gender,
      "dogShare.story.polaroid.kickerMale",
      "dogShare.story.polaroid.kickerFemale",
    ),
  );
  const caption = t("dogShare.story.polaroid.caption", { name });
  const subtitle = [breedName, age].filter(Boolean).join("  •  ");

  const [front, backLeft, backRight] = images;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#FFF9FB", "#FBD9E7", "#F3B9D2"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.backdrop}
      />

      <SafeArea>
        <Text numberOfLines={1} fontWeight="bold" style={styles.kicker}>
          {kicker.toUpperCase()}
        </Text>

        <SafeMiddle style={styles.middle}>
          <View style={styles.fan}>
            {backRight ? (
              <PolaroidFrame
                photo={backRight}
                onSettle={onImageSettled}
                rotate={9}
                width={148}
                style={styles.backRight}
              />
            ) : null}
            {backLeft ? (
              <PolaroidFrame
                photo={backLeft}
                onSettle={onImageSettled}
                rotate={-10}
                width={148}
                style={styles.backLeft}
              />
            ) : null}
            <PolaroidFrame
              photo={front}
              onSettle={onImageSettled}
              rotate={-2}
              width={178}
              caption={caption}
              style={styles.front}
            />
          </View>

          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontWeight="bold"
            style={styles.subtitle}
          >
            {subtitle ? `${name} · ${subtitle}` : name}
          </Text>
        </SafeMiddle>

        <BrandFooter tone="dark" />
      </SafeArea>
    </View>
  );
};

const styles = StyleSheet.create(() => ({
  root: { flex: 1 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  kicker: {
    fontSize: 14,
    letterSpacing: 1.2,
    color: INK,
    textAlign: "center",
  },
  middle: { alignItems: "center", gap: 18 },
  fan: {
    width: 260,
    height: 236,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  backLeft: { position: "absolute", left: 4, top: 10 },
  backRight: { position: "absolute", right: 4, top: 14 },
  front: { position: "absolute", top: 0 },
  subtitle: { fontSize: 16, color: INK },
}));
