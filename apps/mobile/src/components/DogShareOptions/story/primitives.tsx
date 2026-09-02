import type { StoryPhoto } from "./types";

import type { ComponentProps, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useEffect } from "react";
import { View } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import { Image } from "@/components/image";
import { Text } from "@/components/text";

import {
  INK,
  PAW_ASPECT,
  PHOTO_FALLBACK_COLOR,
  SAFE_BOTTOM_INSET,
  SAFE_TOP,
  WHITE,
} from "./constants";

/**
 * The paw logo mark at a given box size, tinted a single flat colour.
 *
 * `opacity` is a real prop rather than baked into an `rgba()` `color` —
 * `react-native-svg`'s `Stop` renders `stopColor`'s alpha channel as fully
 * opaque, so a translucent watermark needs RN's own composited opacity on
 * the wrapping view instead.
 */
export const PawMark = ({
  size = 20,
  color = WHITE,
  opacity = 1,
  style,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[style, { opacity }]}>
    <Logo
      width={size}
      height={size * PAW_ASPECT}
      colorStopOne={color}
      colorStopTwo={color}
    />
  </View>
);

/**
 * The always-present "where this came from" mark. Every variant renders one
 * of these — viewers who don't already know Pegada must be able to tell
 * what it is from the image alone — plus a small line aimed at the viewer
 * rather than the dog on screen: people download an app for something
 * *they* get to do, not to admire someone else's post.
 */
export const BrandFooter = ({
  tone = "light",
  style,
}: {
  tone?: "light" | "dark";
  style?: StyleProp<ViewStyle>;
}) => {
  const { t } = useTranslation();
  const color = tone === "light" ? WHITE : INK;

  return (
    <View style={style}>
      <View style={primitiveStyles.brandRow}>
        <PawMark size={15} color={color} />
        <Text fontWeight="bold" style={[primitiveStyles.brandText, { color }]}>
          pegada.app
        </Text>
      </View>
      <Text
        numberOfLines={1}
        fontWeight="medium"
        style={[primitiveStyles.brandCta, { color }]}
      >
        {t("dogShare.story.footerCta")}
      </Text>
    </View>
  );
};

/**
 * Fills the card and pads its content to `SAFE_TOP`..`SAFE_BOTTOM` so every
 * variant gets safe-zone compliance structurally, rather than by each one
 * re-deriving the same margin arithmetic. Stack a top block, a flexible
 * middle (`justifyContent: "center"` by default, so it settles nicely
 * whether it holds one photo or four), and `BrandFooter` as children —
 * normal flow then pins the footer to `SAFE_BOTTOM` on its own.
 */
export const SafeArea = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) => <View style={[primitiveStyles.safeArea, style]}>{children}</View>;

/** The flexible middle slot between `SafeArea`'s top block and its footer. */
export const SafeMiddle = ({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) => <View style={[primitiveStyles.safeMiddle, style]}>{children}</View>;

/**
 * A single photo slot with a branded fallback for dogs with no photo (or a
 * slot beyond how many the dog has). `onSettle` fires exactly once either
 * way, synchronously on mount for the fallback case since there is nothing
 * to wait for — see `StoryVariantProps.onImageSettled`.
 */
export const PhotoOrFallback = ({
  photo,
  onSettle,
  style,
  contentFit = "cover",
  fallbackIconSize = 48,
}: {
  photo: StoryPhoto | undefined;
  onSettle: () => void;
  style?: StyleProp<ViewStyle>;
  contentFit?: "cover" | "contain";
  fallbackIconSize?: number;
}) => {
  const hasPhoto = Boolean(photo?.url);

  useEffect(() => {
    if (hasPhoto) return;
    onSettle();
    // `onSettle` is a per-render aggregator callback from the parent, not a
    // stable identity we should re-fire on — only `hasPhoto` flipping (never,
    // in practice, since a dog's photo list doesn't change mid-capture)
    // should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto]);

  if (!hasPhoto || !photo) {
    return (
      <View style={[style, primitiveStyles.fallback]}>
        <PawMark size={fallbackIconSize} color={WHITE} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: photo.url, blurhash: photo.blurhash ?? undefined }}
      // `style` is typed against `ViewStyle` so every call site — most of
      // which pass a fallback `View` too — can share one prop. The only
      // incompatible member is `overflow: "scroll"`, which nothing here
      // ever sets, so the cast to `expo-image`'s stricter `ImageStyle` is
      // safe in practice.
      style={style as ComponentProps<typeof Image>["style"]}
      contentFit={contentFit}
      transition={0}
      onLoadEnd={onSettle}
    />
  );
};

/** A rounded pill label, e.g. a breed or age chip. */
export const Chip = ({
  children,
  tone = "solid",
  style,
}: {
  children: ReactNode;
  tone?: "solid" | "outline";
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[
      primitiveStyles.chip,
      tone === "outline" && primitiveStyles.chipOutline,
      style,
    ]}
  >
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      fontWeight="semibold"
      style={[
        primitiveStyles.chipText,
        tone === "outline" && primitiveStyles.chipTextOutline,
      ]}
    >
      {children}
    </Text>
  </View>
);

/** A gradient darkening the bottom of a photo so overlaid text stays legible. */
export const BottomScrim = ({
  height,
  style,
}: {
  height: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const dynamicStyle: ViewStyle = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height,
  };

  return (
    <LinearGradient
      colors={["rgba(15, 23, 42, 0)", "rgba(15, 23, 42, 0.72)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[dynamicStyle, style]}
    />
  );
};

/**
 * A rounded speech bubble with a tail poking out one corner, for the dog's
 * own "voice" lines. Rotated a few degrees off-axis by default — dead level
 * reads like a form field, a slight tilt reads like it was stuck on.
 */
export const SpeechBubble = ({
  children,
  rotate = -3,
  align = "left",
  style,
}: {
  children: ReactNode;
  rotate?: number;
  align?: "left" | "right";
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[
      primitiveStyles.bubbleWrap,
      { transform: [{ rotate: `${rotate}deg` }] },
      style,
    ]}
  >
    <View style={primitiveStyles.bubble}>
      <Text
        numberOfLines={2}
        fontWeight="bold"
        style={primitiveStyles.bubbleText}
      >
        {children}
      </Text>
    </View>
    <View
      style={[
        primitiveStyles.bubbleTail,
        align === "right" && primitiveStyles.bubbleTailRight,
      ]}
    />
  </View>
);

/**
 * A photo framed like an instant print, with a caption strip along the
 * bottom edge. `rotate` gives the fanned-stack look its life; pass `0` for
 * a single, straight print.
 */
export const PolaroidFrame = ({
  photo,
  onSettle,
  caption,
  rotate = 0,
  width = 168,
  style,
}: {
  photo: StoryPhoto | undefined;
  onSettle: () => void;
  caption?: string;
  rotate?: number;
  width?: number;
  style?: StyleProp<ViewStyle>;
}) => {
  const photoSize = width - 20;
  const frameStyle: ViewStyle = {
    width,
    transform: [{ rotate: `${rotate}deg` }],
  };
  const photoStyle: ViewStyle = {
    width: photoSize,
    height: photoSize,
    borderRadius: 3,
  };

  return (
    <View style={[primitiveStyles.polaroid, frameStyle, style]}>
      <PhotoOrFallback
        photo={photo}
        onSettle={onSettle}
        contentFit="cover"
        fallbackIconSize={Math.round(width * 0.26)}
        style={photoStyle}
      />
      {caption ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          fontWeight="black"
          style={primitiveStyles.polaroidCaption}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

const primitiveStyles = StyleSheet.create(() => ({
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: SAFE_TOP,
    paddingBottom: SAFE_BOTTOM_INSET,
    paddingHorizontal: 26,
  },
  safeMiddle: {
    flex: 1,
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  brandText: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
  brandCta: {
    marginTop: 3,
    fontSize: 11.5,
    textAlign: "center",
    opacity: 0.7,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PHOTO_FALLBACK_COLOR,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  chipText: {
    fontSize: 12.5,
    color: INK,
  },
  chipTextOutline: {
    color: WHITE,
  },
  bubbleWrap: {
    alignSelf: "flex-start",
  },
  bubble: {
    backgroundColor: WHITE,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
    maxWidth: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  bubbleText: {
    fontSize: 17,
    lineHeight: 21,
    color: INK,
  },
  bubbleTail: {
    position: "absolute",
    bottom: -7,
    left: 26,
    width: 18,
    height: 18,
    backgroundColor: WHITE,
    transform: [{ rotate: "45deg" }],
  },
  bubbleTailRight: {
    left: undefined,
    right: 26,
  },
  polaroid: {
    backgroundColor: WHITE,
    borderRadius: 6,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  polaroidCaption: {
    marginTop: 10,
    fontSize: 11.5,
    color: INK,
    letterSpacing: 0.3,
    textAlign: "center",
  },
}));
