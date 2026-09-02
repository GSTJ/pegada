import type { StoryPhotoSlot } from "./photos";
import type { StoryPhoto } from "./types";

import type { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useEffect } from "react";
import { View } from "react-native";

import Svg, { Circle, Defs, Pattern, Polygon, Rect } from "react-native-svg";
import { StyleSheet } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import { Image } from "@/components/image";

import { INK, PAW_ASPECT, WHITE } from "./constants";

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
  color = INK,
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
 * One photo, or the branded fallback when there is nothing to show.
 *
 * `onSettle` fires exactly once either way — synchronously on mount for the
 * fallback, since there is nothing to wait for, and on `onLoadEnd` for a
 * real photo. `story-card.tsx` counts these to decide when the offscreen
 * card is safe to capture (see `StoryVariantProps.onImageSettled`).
 */
export const StoryImage = ({
  photo,
  onSettle,
  style,
  fallbackColor,
  fallbackIconSize = 40,
}: {
  photo: StoryPhoto | undefined;
  onSettle: () => void;
  style?: StyleProp<ViewStyle>;
  fallbackColor: string;
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
      <View
        style={[style, styles.fallback, { backgroundColor: fallbackColor }]}
      >
        <PawMark size={fallbackIconSize} color={INK} opacity={0.28} />
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
      contentFit="cover"
      transition={0}
      onLoadEnd={onSettle}
    />
  );
};

/**
 * Tiles a variant's photo frame from a plan's mosaic slots.
 *
 * Every pane is absolutely positioned off its slot's fractional rect, so the
 * "what does two photos look like" decision stays in `photos.ts` where a
 * test can read it. `gutter` is applied as an inset on each pane rather than
 * baked into the rects, which keeps the fractions tiling edge to edge and
 * the gaps a constant width whatever the frame's size.
 */
export const PhotoMosaic = ({
  slots,
  onSettle,
  gutter = 3,
  gutterColor = WHITE,
  fallbackColor,
  style,
}: {
  slots: StoryPhotoSlot[];
  onSettle: () => void;
  gutter?: number;
  gutterColor?: string;
  fallbackColor: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[style, { backgroundColor: gutterColor }]}>
    {slots.map((slot) => (
      <View
        key={slot.index}
        style={[
          styles.pane,
          {
            left: `${slot.rect.x * 100}%`,
            top: `${slot.rect.y * 100}%`,
            width: `${slot.rect.width * 100}%`,
            height: `${slot.rect.height * 100}%`,
            padding: gutter / 2,
          },
        ]}
      >
        <StoryImage
          photo={slot.photo}
          onSettle={onSettle}
          fallbackColor={fallbackColor}
          style={styles.paneImage}
        />
      </View>
    ))}
  </View>
);

/**
 * A dashed rule drawn as a row of segments.
 *
 * RN's `borderStyle: "dashed"` only paints reliably when all four border
 * widths match, which a single horizontal perforation line does not — so the
 * ticket's tear lines are real views instead.
 */
export const DashedRule = ({
  width,
  dash = 7,
  gap = 5,
  thickness = 1.4,
  color = INK,
  style,
}: {
  width: number;
  dash?: number;
  gap?: number;
  thickness?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const count = Math.max(1, Math.floor((width + gap) / (dash + gap)));

  return (
    <View style={[styles.dashRow, style]}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={{
            width: dash,
            height: thickness,
            marginRight: gap,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
};

/**
 * The concept's checkerboard column, drawn with an SVG tile pattern rather
 * than a few hundred nested `View`s. `react-native-svg` renders into a real
 * layer on iOS, so `captureRef` picks it up the same as any other view.
 */
export const CheckerField = ({
  width,
  height,
  cell,
  color,
  opacity = 1,
  style,
}: {
  width: number;
  height: number;
  cell: number;
  color: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[style, { width, height, opacity }]}>
    <Svg width={width} height={height}>
      <Defs>
        <Pattern
          id="checker"
          width={cell * 2}
          height={cell * 2}
          patternUnits="userSpaceOnUse"
        >
          <Rect x={0} y={0} width={cell} height={cell} fill={color} />
          <Rect x={cell} y={cell} width={cell} height={cell} fill={color} />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#checker)" />
    </Svg>
  </View>
);

/** The ticket concept's dot-grid texture over the navy stock. */
export const DotField = ({
  width,
  height,
  spacing,
  radius,
  color,
  opacity = 1,
  style,
}: {
  width: number;
  height: number;
  spacing: number;
  radius: number;
  color: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[style, { width, height, opacity }]}>
    <Svg width={width} height={height}>
      <Defs>
        <Pattern
          id="dots"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
        >
          <Circle cx={radius} cy={radius} r={radius} fill={color} />
        </Pattern>
      </Defs>
      <Rect width={width} height={height} fill="url(#dots)" />
    </Svg>
  </View>
);

/**
 * The speech bubble's tail: a right triangle with the same hard black line
 * as the bubble on its two outer edges. Drawn in SVG because RN has no
 * `clip-path`, and a rotated square would need an overlapping cover strip to
 * hide the diagonal's inner half — which `captureRef` renders as a visible
 * seam.
 */
export const BubbleTail = ({
  size,
  stroke,
  fill = WHITE,
  style,
}: {
  size: number;
  stroke: number;
  fill?: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[style, { width: size, height: size }]}>
    <Svg width={size} height={size}>
      <Polygon
        points={`0,0 ${size},0 0,${size}`}
        fill={fill}
        stroke={INK}
        strokeWidth={stroke * 2}
        strokeLinejoin="miter"
      />
      {/* The top edge sits flush against the bubble's own body, so it is
          painted back over in the fill colour to hide the seam. */}
      <Rect x={0} y={0} width={size} height={stroke} fill={fill} />
    </Svg>
  </View>
);

const styles = StyleSheet.create(() => ({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  pane: {
    position: "absolute",
  },
  paneImage: {
    width: "100%",
    height: "100%",
  },
  dashRow: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
}));
