import type { StoryPhotoSlot } from "./photos";
import type { StoryPhoto } from "./types";

import type { ComponentProps } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

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
  CAP_LINE,
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
 * A word set on the concept's marker slab: a filled box with a hard keyline,
 * sized by the WORD rather than by a constant. The box takes the text's own
 * width plus the concept's side padding, and a height built from the cap band
 * plus the same padding over and under it, so the word sits inside the slab
 * with even space all round whatever a locale puts in it.
 *
 * The word hangs off its cap line rather than being laid out in the box:
 * Gilroy's line box is half again as tall as its capitals, and a slab that
 * tall would stand well clear of the one the concept draws. Nothing clips the
 * overhang — RN views do not clip their children — and no glyph draws in it
 * anyway, since every word set this way is uppercase.
 */
export const MarkerSlab = ({
  fontSize,
  capHeight,
  padX,
  padY,
  border,
  tracking = 0,
  fill,
  textStyle,
  children,
  style,
}: {
  fontSize: number;
  /** The cap band the slab is built around, in points. */
  capHeight: number;
  padX: number;
  padY: number;
  border: number;
  /** The word's own `letterSpacing`, so the slab can take back the copy of
   *  it that lands after the last letter. */
  tracking?: number;
  fill: string;
  textStyle?: StyleProp<TextStyle>;
  children: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[
      styles.markerSlab,
      {
        height: capHeight + padY * 2 + border * 2,
        paddingHorizontal: padX,
        borderWidth: border,
        backgroundColor: fill,
      },
      style,
    ]}
  >
    <Text
      numberOfLines={1}
      fontWeight="black"
      style={[
        textStyle,
        {
          marginTop: padY - CAP_LINE * fontSize,
          // iOS puts a letter space after the LAST letter as well as between
          // them, so a run set at the concept's -6px tracking measures six
          // pixels narrower than the ink it draws and the slab closed to
          // within 11px of the final A against 25 on the other side. Giving
          // that last space back to the box is what makes the two gaps the
          // same padding either side of the word.
          marginRight: -tracking,
        },
      ]}
    >
      {children}
    </Text>
  </View>
);

/**
 * The ticket stub's outline, drawn as one path so its two tear notches are
 * real bites out of the edge: the keyline runs down the side, curves into the
 * half circle and back out again. Laying a bordered disc over a bordered box
 * instead leaves the box's own edge running straight behind it, which reads as
 * a sticker rather than a punched hole.
 *
 * The path is its own half-stroke inside the box so the whole keyline lands
 * within the stub, matching a CSS `border` on a border-box element.
 */
export const TicketOutline = ({
  width,
  height,
  stroke,
  notchRadius,
  notchY,
  color = INK,
  style,
}: {
  width: number;
  height: number;
  stroke: number;
  /** Outer radius of the notch, the same circle the background shows through. */
  notchRadius: number;
  notchY: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const inset = stroke / 2;
  // The keyline sits just OUTSIDE the bite, the way it sits just inside the
  // stub's straight edges: the path's centre line is a half-stroke clear of
  // the circle, so the ink runs from `notchRadius` out to `notchRadius +
  // stroke` and the whole half circle of background stays uncovered. Running
  // the path along the circle itself instead would lay the keyline over the
  // outer third of the bite and shrink the hole by a stroke's width.
  const radius = notchRadius + inset;
  // Where the notch's arc crosses the side the keyline runs down.
  const half = Math.sqrt(Math.max(radius * radius - inset * inset, 0));

  // `Svg` puts its `width` and `height` through `parseInt` before they reach
  // the canvas's own style, so a fractional point size truncates: the stub is
  // 940 concept px = 313.33pt wide and the canvas came out 313pt, a device
  // pixel short of the box. The path is still drawn to the full width, so
  // that last pixel of the right-hand keyline was clipped off the canvas and
  // the stub's cream showed through between the ink and the card. Rounding
  // the canvas up leaves every coordinate where it is and gives the stroke
  // room to land; the surplus is transparent and falls outside the stub's
  // own clip. The left edge never showed it because the canvas starts at 0.
  const canvasWidth = Math.ceil(width);
  const canvasHeight = Math.ceil(height);

  return (
    <View style={[style, { width, height }]} pointerEvents="none">
      <Svg width={canvasWidth} height={canvasHeight}>
        <Path
          d={
            `M${inset},${inset}` +
            `L${width - inset},${inset}` +
            `L${width - inset},${notchY - half}` +
            `A${radius},${radius} 0 0 0 ${width - inset},${notchY + half}` +
            `L${width - inset},${height - inset}` +
            `L${inset},${height - inset}` +
            `L${inset},${notchY + half}` +
            `A${radius},${radius} 0 0 0 ${inset},${notchY - half}` +
            "Z"
          }
          fill="none"
          stroke={color}
          strokeWidth={stroke}
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
 * The speech bubble's tail: the bubble's own fill running down past its square
 * bottom-left corner to a point, with the bubble's keyline carried around BOTH
 * of the tail's outside edges in the same stroke as the bubble itself.
 *
 * Drawn as two polygons — the ink silhouette, then the fill inset inside it —
 * rather than as a stroked path, so the keyline's width is exact on the
 * diagonal as well as the vertical and the tip closes to a solid point the way
 * a drawn tail does.
 *
 * The fill's inset stops at `joinAt`, the depth at which the bubble's own
 * bottom border passes: above that line the tail is inside the bubble, so it
 * runs out to the full silhouette and merges with the white padding, and the
 * bubble's bottom border is interrupted exactly where the tail meets it. Below
 * it the ink is the outline the tail is read by.
 */
export const BubbleTail = ({
  size,
  stroke,
  joinAt,
  fill = WHITE,
  style,
}: {
  size: number;
  stroke: number;
  /** How far down the tail the bubble's own bottom border ends. */
  joinAt: number;
  fill?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  // The hypotenuse runs `x + y = size`; insetting it by `stroke` measured
  // perpendicular moves that line in by `stroke * sqrt(2)` along either axis.
  const bite = stroke * Math.SQRT2;
  const apex = size - bite - stroke;
  /**
   * How far past the silhouette the fill runs where it is covering it.
   *
   * Above the join the tail is inside the bubble and its hypotenuse has
   * nothing to divide, so the fill has to reach the full silhouette there.
   * Running it exactly along that edge put two antialiased edges on the same
   * line and left a grey hairline climbing off the tail and across the
   * bubble's white; running it a hair outside instead covers the ink
   * outright. A third of the stroke is enough to separate them and still
   * lands well inside the bubble's own bottom keyline, which is the only
   * thing on that side for it to eat into.
   */
  const over = stroke / 3;

  return (
    <View style={[style, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Polygon points={`0,0 ${size},0 0,${size}`} fill={INK} />
        <Polygon
          points={[
            `${stroke},0`,
            `${size + over},0`,
            `${size + over - joinAt},${joinAt}`,
            `${size - bite - joinAt},${joinAt}`,
            `${stroke},${apex}`,
          ].join(" ")}
          fill={fill}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create(() => ({
  brandRow: { flexDirection: "row", alignItems: "flex-start" },
  markerSlab: { alignSelf: "flex-start", borderColor: INK },
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
