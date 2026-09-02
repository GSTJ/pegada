import type { StoryVariantProps } from "../types";

import type { LayoutChangeEvent } from "react-native";

import { useCallback, useState } from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { CARD_HEIGHT, CARD_WIDTH } from "../../story-card-styles";
import {
  BASELINE,
  CAP_LINE,
  DM,
  GILROY_LINE,
  INK,
  WHITE,
  capTop,
  halfLeading,
  px,
} from "../constants";
import { pickByGender, pickByHash } from "../gender";
import { mosaicSlots } from "../photos";
import {
  BrandLockup,
  BubbleTail,
  CheckerField,
  MarkerSlab,
  PawMark,
  PhotoMosaic,
} from "../primitives";

/**
 * Concept 06, "DM aberta".
 *
 * Every number below is the concept's own, passed through `px` (see
 * `../constants`), and every run of type is positioned by its CAP LINE rather
 * than by the top of its box — a browser and iOS put the baseline in
 * different places inside a line box, and the caps are the landmark they
 * agree on. Nothing sets `lineHeight` except the two chat bubbles: leaving it
 * unset gives the font's own box, which is what those cap-line offsets assume.
 */

/** `.checker`: a 64px conic tile, so 32px cells, down the right edge. */
const CHECKER_WIDTH = px(330);
const CHECKER_CELL = px(32);
/** `.edge`: the pink rule down the left edge, also full bleed. */
const EDGE_BAR = px(24);

/**
 * `.brand`: `top:278px; left:65px; gap:13px`, a 40x42 mark against 26px type.
 *
 * The concept's own `logo.svg` carries about 2.4px of empty viewBox either
 * side of the paw at that size and the app's `Logo` carries none, so the
 * lockup is anchored on the INK instead — left 67.4 rather than 65, and a
 * 15.4px gap rather than 13 — and both renders land the same pixels in the
 * same place.
 */
const BRAND = {
  left: px(67.4),
  top: px(278),
  mark: px(42),
  gap: px(15.4),
  size: px(26),
};

/** `.online`: `top:285px; right:66px; padding:9px 13px 6px`, 17px type. */
const ONLINE = {
  top: px(285),
  right: px(66),
  size: px(17),
  tracking: px(2),
  dot: px(11),
  dotGap: px(8),
};

/**
 * `h1`: `top:356px; left:58px`, 118px on a .77 line box, `letter-spacing:-6px`.
 *
 * The two lines are placed by hand rather than stacked, because line two is a
 * row — the word plus the marker slab beside it — and because the concept's
 * .77 leading is far tighter than any line box iOS will lay out.
 */
const H1_SIZE = px(118);
const H1_TRACKING = px(-6);
const H1_LEFT = px(58);
/** The cap lines the concept render actually draws, 102px apart: `top:356px`
 *  plus the half-leading of a .77 line box for the first, and for the second
 *  whatever the marker slab's taller line box puts it at. */
const H1_LINE_ONE_TOP = capTop(371, 118);
const H1_LINE_TWO_TOP = capTop(473, 118);
/** The concept's own line stops eight pixels short of the frame. Anything
 *  longer is scaled down to that run rather than being allowed to push the
 *  slab's keyline off the card. */
const H1_LINE_TWO_WIDTH = CARD_WIDTH - H1_LEFT - px(8);

/**
 * `.cut`: `border:5px; padding:6px 17px 0` around the word, `rotate(-2deg)`.
 *
 * The concept's padding is asymmetric — nothing under the word — which drops
 * the capitals through the slab's bottom keyline. Here the padding matches top
 * and bottom, so the word sits inside its own box, and the slab is still the
 * concept's own height because the concept's slack was simply all above the
 * caps: 7px either side of an 82.6px cap band inside a 5px keyline is the same
 * 106.6px box.
 */
const MARKER_BORDER = px(5);
const MARKER_PAD_X = px(17);
const MARKER_PAD_Y = px(7);
const MARKER_CAP = px(118 * 0.7);
/** Where the slab's own top sits against the cap line the row is built on. */
const MARKER_TOP = CAP_LINE * H1_SIZE - MARKER_BORDER - MARKER_PAD_Y;

/**
 * `.scribble`: `right:58px; top:612px`, 31px, `rotate(9deg)`, over a rule
 * directly under the words, as wide as they are and tilted with them.
 */
const SCRIBBLE_TOP = px(612) + halfLeading(31);
const SCRIBBLE = {
  right: px(58),
  top: SCRIBBLE_TOP,
  size: px(31),
  maxWidth: px(922),
  ruleStroke: px(5),
  /**
   * The rule's place is taken from the concept's grid rather than from the run
   * above it: `UIFont` reports a line box a few points shorter than Gilroy's
   * metrics say, so stacking the rule under the text floats it up by that
   * much. The block's height is stated for the same reason — it also decides
   * where the nine-degree rotation pivots.
   */
  height: px(31 * GILROY_LINE + 22),
  ruleTop: px(612 + 31 * GILROY_LINE) - SCRIBBLE_TOP,
};

/**
 * `.photo-bubble`: `left:64px; top:690px`, 760x640, a 6px keyline, 18px of
 * white padding and `border-radius:140px 140px 140px 18px` over a photo
 * rounded to `116px 116px 116px 4px`.
 */
const BUBBLE = {
  left: px(64),
  top: px(690),
  width: px(760),
  height: px(640),
  border: px(6),
  padding: px(18),
  radius: px(140),
  /** The one square corner, where the tail hangs off. */
  corner: px(18),
  innerRadius: px(116),
  innerCorner: px(4),
};

/**
 * `.photo-bubble:after`: a square clipped to a triangle and hung 66px below
 * the bubble's padding box, so it covers the stretch of bottom border it grows
 * out of instead of butting against it.
 *
 * The concept's square is 88, which starts it four pixels INSIDE the photo and
 * notches a white wedge out of the print's bottom-left corner. 84 puts the top
 * edge exactly on the photo's own bottom instead: same hypotenuse, same line,
 * same point, and nothing of the photo shows through it.
 */
const TAIL = {
  size: px(84),
  drop: px(66),
  /** How far down the tail the bubble's own bottom border passes — the depth
   *  at which the tail stops being inside the bubble and needs its outline. */
  join: px(24),
};

/** `.bubble.b1`, hoisted out of the sheet because the no-photo panel below
 *  has to know where its left edge lands. */
const CHAT_ONE = { top: px(1042), right: px(52), width: px(320) };
/**
 * The chat bubbles keep the concept's own 1.02 leading rather than the font's
 * line box — the only two runs on the card that do. Both wrap to two lines,
 * and the roomier box would grow each bubble by a third and walk it off the
 * photo. Safe at this size: the tallest thing Gilroy's lowercase draws here is
 * a tilde, which still clears the compressed fragment.
 */
const CHAT_LINE = 10.5;

/**
 * `.typing`: the concept draws this as a 475px bar, which at story size reads
 * as an empty input field rather than as somebody typing. It is a chat bubble
 * here instead — three dots centred in a small round bubble, about as wide as
 * a reply bubble's own padding — sitting at the concept's left margin under
 * the tail.
 */
const TYPING = {
  left: px(65),
  top: px(1397),
  width: px(160),
  height: px(66),
  border: px(5),
  gap: px(12),
  dot: px(13),
};

/** `.cta`: `left:62px; top:1528px`, 42px on a .95 line box. */
const CTA_SIZE = px(42);
const CTA_LEFT = px(62);
const CTA_LINE_ONE_TOP = px(1528) + halfLeading(42, 0.95);
const CTA_LINE_TWO_TOP = CTA_LINE_ONE_TOP + px(42 * 0.95);
/** The underlined span's `border-bottom:7px`, which a browser hangs off the
 *  bottom of its .95 line box — 0.9px under the baseline at this size. */
const CTA_RULE_TOP = BASELINE * CTA_SIZE + px(0.9);
const CTA_RULE_HEIGHT = px(7);
/** The line runs to where the concept's arrow button used to start. */
const CTA_WIDTH = px(900 - 62 - 40);

/**
 * How wide the dog's name can be drawn in the no-photo panel.
 *
 * Not the panel's width. `chatBubbleOne` is painted OVER this panel (it
 * carries a higher `zIndex` and is a later sibling), and it reaches from
 * the card's right edge back to `CHAT_ONE`'s left, straight across the row
 * the centred name sits on. A name laid out to the panel's full width
 * therefore disappears under the chat bubble rather than being clipped by
 * anything: `MAXIMILIANO FERREIRA` lost its last two letters with the panel
 * itself still showing teal underneath.
 *
 * So the name is measured against the strip that stays visible, centred on
 * the panel like the paw mark above it, with `SAFE_GAP` of teal left
 * between the last letter and the bubble's keyline. `adjustsFontSizeToFit`
 * only ever shrinks, so short names still draw at the full `fontSize`.
 */
const EMPTY_NAME_SAFE_GAP = 8;
const BUBBLE_INNER_WIDTH =
  BUBBLE.width - BUBBLE.border * 2 - BUBBLE.padding * 2;
const BUBBLE_INNER_LEFT = BUBBLE.left + BUBBLE.border + BUBBLE.padding;
const CHAT_ONE_LEFT = CARD_WIDTH - CHAT_ONE.right - CHAT_ONE.width;
const EMPTY_NAME_WIDTH =
  2 *
  (CHAT_ONE_LEFT -
    EMPTY_NAME_SAFE_GAP -
    (BUBBLE_INNER_LEFT + BUBBLE_INNER_WIDTH / 2));

/** Deterministic per dog, so a capture retry never swaps the opener. */
const OPENER_KEYS = [
  "dogShare.story.dmAberta.opener1",
  "dogShare.story.dmAberta.opener2",
  "dogShare.story.dmAberta.opener3",
] as const;

/** Chat chrome, not copy — the clock reads the same in both locales. */
const SENT_AT = "15:42";
const REPLIED_AT = "15:43";

export const DmAbertaVariant = ({
  dog,
  plan,
  name,
  gender,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();

  /**
   * How far the headline's second line has to come down to keep the slab's
   * keyline on the card. The row is laid out at its natural width and scaled
   * afterwards, so the word and the box around it shrink together and the
   * slab's padding stays even at any length — auto-shrinking the type inside
   * a fixed box would leave the slab too tall for the word in it.
   *
   * A transform does not affect layout, so the measurement this reads is
   * always the untransformed width and settling on a scale cannot loop.
   */
  const [markScale, setMarkScale] = useState(1);

  const handleHeadlineLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width <= 0) return;
    const next = Math.min(1, H1_LINE_TWO_WIDTH / width);
    setMarkScale((current) =>
      Math.abs(current - next) < 0.001 ? current : next,
    );
  }, []);

  const opener = t(pickByHash(OPENER_KEYS, dog.id));
  const reply = t(
    pickByGender(
      gender,
      "dogShare.story.dmAberta.replyMale",
      "dogShare.story.dmAberta.replyFemale",
    ),
  );

  return (
    <View style={styles.root}>
      <CheckerField
        width={CHECKER_WIDTH}
        height={CARD_HEIGHT}
        cell={CHECKER_CELL}
        color={DM.checker}
        opacity={0.45}
        style={styles.checker}
      />
      <View style={styles.edgeBar} />

      <BrandLockup
        markHeight={BRAND.mark}
        gap={BRAND.gap}
        fontSize={BRAND.size}
        style={styles.brand}
      />

      <View style={styles.onlineBadge}>
        <View style={styles.onlineDot} />
        <Text fontWeight="black" style={styles.onlineText}>
          {t("dogShare.story.dmAberta.online")}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        fontWeight="black"
        style={[styles.headlineText, styles.headlineOne]}
      >
        {t("dogShare.story.dmAberta.headline1")}
      </Text>
      <View
        onLayout={handleHeadlineLayout}
        style={[
          styles.headlineTwo,
          {
            top: H1_LINE_TWO_TOP + CAP_LINE * H1_SIZE * (1 - markScale),
            transform: [{ scale: markScale }],
          },
        ]}
      >
        <Text fontWeight="black" style={styles.headlineText}>
          {t("dogShare.story.dmAberta.headline2")}{" "}
        </Text>
        <MarkerSlab
          fontSize={H1_SIZE}
          capHeight={MARKER_CAP}
          padX={MARKER_PAD_X}
          padY={MARKER_PAD_Y}
          border={MARKER_BORDER}
          fill={DM.edge}
          textStyle={styles.headlineText}
          style={styles.marker}
        >
          {t("dogShare.story.dmAberta.headlineMark")}
        </MarkerSlab>
      </View>

      <View style={styles.scribble}>
        <Text numberOfLines={1} fontWeight="black" style={styles.scribbleText}>
          {t("dogShare.story.dmAberta.scribble", { name })}
        </Text>
        <View style={styles.scribbleRule} />
      </View>

      <View style={styles.bubble}>
        {plan.isEmpty ? (
          <View style={styles.bubbleInner}>
            <View style={styles.emptyPanel}>
              <PawMark size={52} color={INK} opacity={0.9} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                fontWeight="black"
                style={styles.emptyName}
              >
                {name}
              </Text>
            </View>
          </View>
        ) : (
          <PhotoMosaic
            slots={mosaicSlots(plan)}
            onSettle={onImageSettled}
            gutter={4}
            gutterColor={WHITE}
            fallbackColor={DM.checker}
            style={styles.bubbleInner}
          />
        )}
        <BubbleTail
          size={TAIL.size}
          stroke={BUBBLE.border}
          joinAt={TAIL.join}
          style={styles.tail}
        />
      </View>

      <View style={[styles.chatBubble, styles.chatBubbleOne]}>
        <Text numberOfLines={2} fontWeight="black" style={styles.chatText}>
          {opener}
        </Text>
        <Text fontWeight="bold" style={styles.chatTime}>
          {SENT_AT} ✓✓
        </Text>
      </View>

      <View style={[styles.chatBubble, styles.chatBubbleTwo]}>
        <Text numberOfLines={2} fontWeight="black" style={styles.chatText}>
          {reply}
        </Text>
        <Text fontWeight="bold" style={styles.chatTime}>
          {REPLIED_AT} ✓✓
        </Text>
      </View>

      <View style={styles.typingBubble}>
        <View style={styles.typingDot} />
        <View style={[styles.typingDot, styles.typingDotMid]} />
        <View style={[styles.typingDot, styles.typingDotLast]} />
      </View>

      <Text
        numberOfLines={1}
        fontWeight="black"
        style={[styles.ctaLine, styles.ctaLineOne]}
      >
        {t("dogShare.story.dmAberta.ctaLine1")}
      </Text>
      <View style={styles.ctaLineTwo}>
        <Text
          numberOfLines={1}
          fontWeight="black"
          style={[styles.ctaLine, styles.ctaLineMark]}
        >
          {t("dogShare.story.dmAberta.ctaLine2", { name })}
        </Text>
        <View style={styles.ctaRule} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create(() => ({
  root: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: DM.paper,
    overflow: "hidden",
  },
  checker: { position: "absolute", top: 0, right: 0 },
  edgeBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: EDGE_BAR,
    backgroundColor: DM.edge,
  },
  brand: { position: "absolute", top: BRAND.top, left: BRAND.left },
  onlineBadge: {
    position: "absolute",
    top: ONLINE.top,
    right: ONLINE.right,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: INK,
    paddingHorizontal: px(13),
    // 9px of padding over the run in the concept, plus the half-leading a
    // browser adds above a line box and iOS does not. The height is stated
    // rather than left to the padding: `UIFont` reports a line box shorter
    // than Gilroy's own metrics, so a padded box comes out a few pixels short.
    paddingTop: px(9) + halfLeading(17),
    height: px(41),
  },
  onlineDot: {
    width: ONLINE.dot,
    height: ONLINE.dot,
    borderRadius: ONLINE.dot / 2,
    marginRight: ONLINE.dotGap,
    // The concept's `:before` is an empty inline-block, so it hangs off the
    // text's baseline rather than centring on it.
    marginTop: BASELINE * ONLINE.size - ONLINE.dot,
    backgroundColor: DM.lime,
  },
  onlineText: {
    fontSize: ONLINE.size,
    color: WHITE,
    letterSpacing: ONLINE.tracking,
    textTransform: "uppercase",
  },
  headlineText: {
    fontSize: H1_SIZE,
    letterSpacing: H1_TRACKING,
    color: INK,
    textTransform: "uppercase",
  },
  headlineOne: {
    position: "absolute",
    zIndex: 4,
    top: H1_LINE_ONE_TOP,
    left: H1_LEFT,
  },
  headlineTwo: {
    position: "absolute",
    zIndex: 4,
    left: H1_LEFT,
    flexDirection: "row",
    alignItems: "flex-start",
    // Scaled from its own top left, so `left` stays the concept's margin and
    // the compensation on `top` only has to put the cap line back.
    transformOrigin: "0% 0%",
  },
  // The concept's marker highlight: a pink slab, hard black keyline, knocked
  // a couple of degrees off level so it reads as drawn on rather than typeset.
  marker: { marginTop: MARKER_TOP, transform: [{ rotate: "-2deg" }] },
  scribble: {
    position: "absolute",
    top: SCRIBBLE.top,
    right: SCRIBBLE.right,
    // Shrinks to the line, so the rule under it is exactly as wide as the
    // words and starts where they do. The cap is a backstop for a name long
    // enough to walk the line off the left edge of the card.
    maxWidth: SCRIBBLE.maxWidth,
    height: SCRIBBLE.height,
    alignItems: "flex-start",
    transform: [{ rotate: "9deg" }],
  },
  scribbleText: { fontSize: SCRIBBLE.size, color: INK },
  scribbleRule: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SCRIBBLE.ruleTop,
    height: SCRIBBLE.ruleStroke,
    backgroundColor: INK,
  },
  bubble: {
    position: "absolute",
    zIndex: 2,
    left: BUBBLE.left,
    top: BUBBLE.top,
    width: BUBBLE.width,
    height: BUBBLE.height,
    backgroundColor: WHITE,
    borderWidth: BUBBLE.border,
    borderColor: INK,
    padding: BUBBLE.padding,
    borderTopLeftRadius: BUBBLE.radius,
    borderTopRightRadius: BUBBLE.radius,
    borderBottomRightRadius: BUBBLE.radius,
    borderBottomLeftRadius: BUBBLE.corner,
  },
  bubbleInner: {
    flex: 1,
    overflow: "hidden",
    borderTopLeftRadius: BUBBLE.innerRadius,
    borderTopRightRadius: BUBBLE.innerRadius,
    borderBottomRightRadius: BUBBLE.innerRadius,
    borderBottomLeftRadius: BUBBLE.innerCorner,
  },
  tail: {
    position: "absolute",
    left: -BUBBLE.border,
    bottom: -TAIL.drop,
  },
  emptyPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DM.checker,
  },
  /**
   * The one label on the card that has to survive any name a user types, so
   * it is the one place `adjustsFontSizeToFit` has to actually fire. A real
   * `width` (see `EMPTY_NAME_WIDTH`) is the box it resolves the shrink
   * against; a `maxWidth` was not one, and it clipped the label instead.
   */
  emptyName: {
    fontSize: 30,
    letterSpacing: px(-6),
    color: INK,
    textTransform: "uppercase",
    textAlign: "center",
    width: EMPTY_NAME_WIDTH,
  },
  chatBubble: {
    position: "absolute",
    zIndex: 6,
    borderWidth: px(5),
    borderColor: INK,
    paddingHorizontal: px(22),
    paddingTop: px(17),
    paddingBottom: px(13),
  },
  chatBubbleOne: {
    top: CHAT_ONE.top,
    right: CHAT_ONE.right,
    width: CHAT_ONE.width,
    backgroundColor: DM.bubbleTeal,
    transform: [{ rotate: "2.5deg" }],
  },
  chatBubbleTwo: {
    top: px(1195),
    right: px(72),
    width: px(330),
    backgroundColor: DM.bubblePink,
    transform: [{ rotate: "-2deg" }],
  },
  chatText: { fontSize: px(26), lineHeight: CHAT_LINE, color: INK },
  chatTime: {
    marginTop: px(10),
    fontSize: px(13),
    letterSpacing: px(1),
    textAlign: "right",
    color: INK,
  },
  typingBubble: {
    position: "absolute",
    left: TYPING.left,
    top: TYPING.top,
    width: TYPING.width,
    height: TYPING.height,
    borderRadius: TYPING.height / 2,
    borderWidth: TYPING.border,
    borderColor: INK,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: TYPING.gap,
  },
  typingDot: {
    width: TYPING.dot,
    height: TYPING.dot,
    borderRadius: TYPING.dot / 2,
    backgroundColor: INK,
  },
  typingDotMid: { opacity: 0.6 },
  typingDotLast: { opacity: 0.3 },
  ctaLine: { fontSize: CTA_SIZE, color: INK },
  ctaLineOne: {
    position: "absolute",
    top: CTA_LINE_ONE_TOP,
    left: CTA_LEFT,
  },
  ctaLineTwo: {
    position: "absolute",
    top: CTA_LINE_TWO_TOP,
    left: CTA_LEFT,
    // Shrinks to the line so the underline is exactly as wide as the words
    // over it. `e fale com Maximiliano Ferreira` needs 617 of the 798 concept
    // pixels this leaves, so nothing realistic reaches the cap.
    maxWidth: CTA_WIDTH,
  },
  ctaLineMark: { color: DM.ctaPink },
  ctaRule: {
    position: "absolute",
    left: 0,
    right: 0,
    top: CTA_RULE_TOP,
    height: CTA_RULE_HEIGHT,
    backgroundColor: INK,
  },
}));
