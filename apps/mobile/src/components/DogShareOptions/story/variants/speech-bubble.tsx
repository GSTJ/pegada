import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { WHITE } from "../constants";
import { pickByHash } from "../gender";
import {
  BottomScrim,
  BrandFooter,
  PhotoOrFallback,
  SafeArea,
  SafeMiddle,
  SpeechBubble,
} from "../primitives";

const LINE_KEYS = [
  "dogShare.story.speechBubble.line1",
  "dogShare.story.speechBubble.line2",
  "dogShare.story.speechBubble.line3",
] as const;

/**
 * One big photo, the dog "talking" through a speech bubble stuck near the
 * top third. The least busy of the set — the joke is entirely in the line,
 * picked deterministically per dog so the same share always lands on the
 * same voice.
 */
export const SpeechBubbleVariant = ({
  dog,
  images,
  name,
  breedName,
  age,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();
  const [photo] = images;
  const line = t(pickByHash(LINE_KEYS, dog.id));
  const subtitle = [breedName, age].filter(Boolean).join("  •  ");

  return (
    <View style={styles.root}>
      <PhotoOrFallback
        photo={photo}
        onSettle={onImageSettled}
        style={styles.photo}
        fallbackIconSize={72}
      />
      <BottomScrim height={280} />

      <SafeArea>
        <SpeechBubble rotate={-3} style={styles.bubble}>
          {line}
        </SpeechBubble>

        <SafeMiddle />

        <View style={styles.nameBlock}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            fontWeight="black"
            style={styles.name}
          >
            {name}
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
        <BrandFooter tone="light" style={styles.footer} />
      </SafeArea>
    </View>
  );
};

const styles = StyleSheet.create(() => ({
  root: { flex: 1 },
  photo: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  bubble: { marginTop: 34 },
  nameBlock: { gap: 4 },
  name: {
    fontSize: 32,
    color: WHITE,
    textShadowColor: "rgba(0, 0, 0, 0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.88)" },
  footer: { marginTop: 16 },
}));
