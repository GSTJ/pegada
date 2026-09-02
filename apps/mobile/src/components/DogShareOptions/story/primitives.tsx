import type { StoryPhotoSlot } from "./photos";
import type { StoryPhoto } from "./types";

import type { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { useEffect } from "react";
import { View } from "react-native";

import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  Polygon,
  Rect,
} from "react-native-svg";
import { StyleSheet } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import { Image } from "@/components/image";
import { Text } from "@/components/text";

import {
  CAP_CENTRE,
  INK,
  PAW_ASPECT,
  WHITE,
  X_CENTRE,
  lineBox,
} from "./constants";

/**
 * `react-native-svg` floors its viewport to whole points, so a box measured
 * in the fractions this card deals in quietly draws the mark small — asking
 * for 11.77 points of paw gets 11, seven per cent under, which at brand size
 * is a visible two pixels in the export.
 *
 * Both axes are therefore rounded UP and `preserveAspectRatio` left to fit
 * the mark to whichever one binds, which is always the axis the caller
 * actually asked for. The other gains up to a point of empty viewBox with the
 * paw centred in it, a third of a pixel either side.
 */
const pawViewport = (width: number, height: number) => ({
  width: Math.ceil(width),
  height: Math.ceil(height),
});

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
      {...pawViewport(size, size * PAW_ASPECT)}
      colorStopOne={color}
      colorStopTwo={color}
    />
  </View>
);

/**
 * The brand lockup: the paw mark and the word "pegada" set as one unit.
 *
 * There is no wordmark asset anywhere in the repo — the website pairs this
 * same paw with plain type — so the lockup is composed here to the concept's
 * own proportions, which each variant passes in as concept pixels. The word
 * is "pegada", not "pegada.app": the domain belongs to the website, the brand
 * is the name.
 *
 * The mark is centred on the band the word's own ink occupies — its x-height
 * set lowercase, its cap height set as an all-caps rail — rather than on its
 * line box. Centring on the line box, which is all a flex `align-items:
 * center` can do, hangs the mark visibly high above that ink. The shift goes
 * on the type rather than the mark so a caller can position the lockup by the
 * mark's own top-left corner, which is what the concepts measure to.
 */
export const BrandLockup = ({
  markHeight,
  gap,
  fontSize,
  tracking = 0,
  uppercase = false,
  color = INK,
  style,
}: {
  /** Height of the paw's ink, in points. */
  markHeight: number;
  /** Space between the paw's ink and the word, in points. */
  gap: number;
  fontSize: number;
  tracking?: number;
  uppercase?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.brandRow, style]}>
    <Logo
      {...pawViewport(markHeight / PAW_ASPECT, markHeight)}
      colorStopOne={color}
      colorStopTwo={color}
    />
    <Text
      fontWeight="black"
      style={[
        uppercase ? styles.brandWordCaps : styles.brandWord,
        {
          marginLeft: gap,
          marginTop:
            markHeight / 2 - (uppercase ? CAP_CENTRE : X_CENTRE) * fontSize,
          fontSize,
          lineHeight: lineBox(fontSize),
          letterSpacing: tracking,
          color,
        },
      ]}
    >
      pegada
    </Text>
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
 * the gaps a constant width whatever the frame's size. `paneBorder` draws
 * the concept's keyline around each photo rather than around the frame, for
 * the compositions that box every print separately.
 */
export const PhotoMosaic = ({
  slots,
  onSettle,
  gutter = 3,
  gutterColor = WHITE,
  paneBorder = 0,
  fallbackColor,
  style,
}: {
  slots: StoryPhotoSlot[];
  onSettle: () => void;
  gutter?: number;
  gutterColor?: string;
  paneBorder?: number;
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
          style={[
            styles.paneImage,
            paneBorder
              ? { borderWidth: paneBorder, borderColor: INK }
              : undefined,
          ]}
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
 * The concept's hand-drawn underline: a `width` x `height` box carrying only
 * a top border, with `border-radius: 50%`.
 *
 * A browser paints that as the crown of an ellipse — `thickness` at the top
 * and tapering to nothing at both ends, because the inner curve is the same
 * ellipse with its vertical radius reduced by the border and its horizontal
 * radius untouched. Drawn here as the region between those two arcs, which
 * is the same shape and, unlike a rotated rectangle, actually curves.
 */
export const ArcRule = ({
  width,
  height,
  thickness,
  color = INK,
  style,
}: {
  width: number;
  height: number;
  thickness: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const rx = width / 2;
  const ry = height / 2;

  return (
    <View style={[style, { width, height }]}>
      <Svg width={width} height={height}>
        <Path
          d={
            `M0,${ry}A${rx},${ry} 0 0 1 ${width},${ry}` +
            `A${rx},${ry - thickness} 0 0 0 0,${ry}Z`
          }
          fill={color}
        />
      </Svg>
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
 * The speech bubble's tail: the bubble's own fill running down past its
 * square bottom-left corner to a point, with the bubble's left keyline
 * carrying on down the outside of it.
 *
 * The concept draws it as a `size` x `size` box clipped to
 * `polygon(0 0, 100% 0, 0 100%)` carrying only a left and a bottom border.
 * The clip keeps the left keyline — tapering to nothing where the hypotenuse
 * crosses it — and throws away all but a sliver of the bottom one, so the
 * hypotenuse itself is unstroked: it is the fill meeting the paper.
 *
 * Drawn as the fill first and the keyline over it, never as two shapes
 * meeting along the hypotenuse: an ink triangle with the fill laid back
 * inside it makes both share that edge exactly, and the two antialiased runs
 * blend into a grey seam down the diagonal.
 *
 * The caller hangs the box off the bubble's bottom so its top edge sits
 * `size` above the point, INSIDE the bubble — which is what interrupts the
 * bubble's bottom border where the tail joins it, exactly as the concept's
 * `bottom: -66px` on a border-box `:after` does.
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
      {/* The tail itself, hypotenuse included. */}
      <Polygon points={`0,0 ${size},0 0,${size}`} fill={fill} />
      {/* The bubble's left keyline carrying on down the outside of it,
          tapering to nothing at the tip exactly as the concept's clipped
          border does. Painted over the fill, so it shares no edge with
          anything but itself. */}
      <Polygon
        points={`0,0 ${stroke},0 ${stroke},${size - stroke} 0,${size}`}
        fill={INK}
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create(() => ({
  brandRow: { flexDirection: "row", alignItems: "flex-start" },
  brandWord: { textTransform: "none" },
  brandWordCaps: { textTransform: "uppercase" },
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
