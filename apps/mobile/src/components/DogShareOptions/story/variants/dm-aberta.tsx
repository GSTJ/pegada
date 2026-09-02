import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { CARD_HEIGHT, CARD_WIDTH } from "../../story-card-styles";
import {
  ARROW_INK_CENTRE,
  BASELINE,
  CAP_LINE,
  DM,
  INK,
  WHITE,
  capTop,
  halfLeading,
  lineBox,
  px,
} from "../constants";
import { pickByGender, pickByHash } from "../gender";
import { mosaicSlots } from "../photos";
import {
  ArcRule,
  BrandLockup,
  BubbleTail,
  CheckerField,
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
 * agree on. Nothing sets `lineHeight`: leaving it unset gives exactly
 * `lineBox`, the font's own box, which is both what those cap-line offsets
 * assume and the only setting iOS will not crop a glyph in.
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

/**
 * `.cut`: `border:5px; padding:6px 17px 0` around the word, `rotate(-2deg)`.
 *
 * The slab is painted as its own layer behind the word rather than as the
 * text's background: the word needs the font's full line box to draw a
 * diacritic, and a background on that box would stand 50px taller than the
 * concept's slab. Its top is measured off the word's cap line — 11px of
 * border and padding above `.cut`'s own content box, plus the 16.4px the caps
 * sit into that box on a .77 leading.
 */
const MARKER_BORDER = px(5);
const MARKER_PAD_X = px(17);
const MARKER_HEIGHT = px(5 + 6 + 118 * 0.77 + 5);
const MARKER_SLAB_TOP = H1_SIZE * CAP_LINE - px(11 + 16.4);

/**
 * `.scribble`: `right:58px; top:612px`, 31px, `rotate(9deg)`, over an
 * `:after` rule 180x22 with a 5px top border, `border-radius:50%` and its own
 * `rotate(-5deg)` — a shallow arc under the text, left-aligned with it and
 * tilted back four degrees off the text, not away from it.
 */
const SCRIBBLE = {
  right: px(58),
  top: px(612) + halfLeading(31),
  size: px(31),
  maxWidth: px(922),
  ruleWidth: px(180),
  ruleHeight: px(22),
  ruleStroke: px(5),
  /** The rule is a block under the text's line box, and iOS starts that box a
   *  half-leading lower than CSS does, so it ends a half-leading lower too. */
  ruleTop: -halfLeading(31),
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
 * the bubble's padding box, so it covers the stretch of bottom border it
 * grows out of instead of butting against it.
 *
 * The concept's square is 88, which starts it four pixels INSIDE the photo
 * and notches a white wedge out of the print's bottom-left corner. 84 puts
 * the top edge exactly on the photo's own bottom instead: the same
 * hypotenuse, on the same line, running to the same point — every visible
 * pixel of the tail is unchanged, because the four it gives up were white
 * padding either way — and the photo no longer shows through it.
 */
const TAIL = { size: px(84), drop: px(66) };

/** `.bubble.b1`, hoisted out of the sheet because the no-photo panel below
 *  has to know where its left edge lands. */
const CHAT_ONE = { top: px(1042), right: px(52), width: px(320) };
/**
 * The chat bubbles keep the concept's own 1.02 leading rather than the
 * font's line box — the only two runs on the card that do. Both wrap to two
 * lines, and the roomier box would grow each bubble by a third and walk it
 * off the photo. Safe at this size: the tallest thing Gilroy's lowercase
 * draws here is a tilde, which still clears the compressed fragment.
 */
const CHAT_LINE = 10.5;

/** `.typing`: `left:65px; top:1397px`, 475x70, 5px keyline, 35px radius. */
const TYPING = {
  left: px(65),
  top: px(1397),
  width: px(475),
  height: px(70),
  radius: px(35),
  border: px(5),
  padLeft: px(26),
  gap: px(12),
  dot: px(13),
};

/** `.seen`: `left:565px; top:1422px`, 16px SemiBold, `letter-spacing:1px`. */
const SEEN = {
  left: px(565),
  top: px(1422) + halfLeading(16),
  size: px(16),
  tracking: px(1),
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
/** The second line runs up to the arrow button and no further. */
const CTA_WIDTH = px(900 - 62 - 40);

/** `.arrow`: 112x112, a 6px keyline, a 62px glyph. */
const ARROW_SIZE = px(112);
const ARROW_BORDER = px(6);
const ARROW_GLYPH = px(62);
const ARROW_RIGHT = px(68);
/**
 * The concept parks the button at `top:1512px`, which leaves its centre 7px
 * above the optical centre of the CTA block beside it. Centred on that block
 * instead — the button and the two lines are one row, and 7px is enough to
 * see.
 */
const CTA_BLOCK_TOP = CTA_LINE_ONE_TOP + CAP_LINE * CTA_SIZE;
const CTA_BLOCK_BOTTOM = CTA_LINE_TWO_TOP + CTA_RULE_TOP + CTA_RULE_HEIGHT;
const ARROW_TOP = (CTA_BLOCK_TOP + CTA_BLOCK_BOTTOM - ARROW_SIZE) / 2;
/** Gilroy draws U+2192 between 50 and 650 units above the baseline, so its
 *  ink centre is `ARROW_INK_CENTRE` up; nudge the run by the difference and
 *  the glyph, not its line box, is what the circle is centred on. */
const ARROW_NUDGE =
  lineBox(ARROW_GLYPH) / 2 - (BASELINE - ARROW_INK_CENTRE) * ARROW_GLYPH;

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
      {/* The marker slab runs to within a few points of the card's right
          edge, as in the concept. It shrinks rather than clipping, so a
          longer word in another locale loses a couple of points of type
          instead of losing its own keyline off the frame. */}
      <View style={styles.headlineTwo}>
        <Text fontWeight="black" style={styles.headlineText}>
          {t("dogShare.story.dmAberta.headline2")}{" "}
        </Text>
        <View style={styles.marker}>
          <View style={styles.markerSlab} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            fontWeight="black"
            style={styles.headlineText}
          >
            {t("dogShare.story.dmAberta.headlineMark")}
          </Text>
        </View>
      </View>

      <View style={styles.scribble}>
        <Text numberOfLines={1} fontWeight="black" style={styles.scribbleText}>
          {t("dogShare.story.dmAberta.scribble", { name })}
        </Text>
        <ArcRule
          width={SCRIBBLE.ruleWidth}
          height={SCRIBBLE.ruleHeight}
          thickness={SCRIBBLE.ruleStroke}
          style={styles.scribbleRule}
        />
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

      <View style={styles.typingPill}>
        <View style={styles.typingDot} />
        <View style={[styles.typingDot, styles.typingDotMid]} />
        <View style={[styles.typingDot, styles.typingDotLast]} />
      </View>
      <Text numberOfLines={1} fontWeight="semibold" style={styles.typingLabel}>
        {t("dogShare.story.dmAberta.typing")}
      </Text>

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

      <View style={styles.arrowCircle}>
        <Text fontWeight="black" style={styles.arrowGlyph}>
          →
        </Text>
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
    // 9px over the run and 6px under it in the concept, redistributed by the
    // half-leading a browser adds above a line box and iOS does not, so the
    // badge keeps its 41px height with the word where the concept sets it.
    paddingTop: px(9) + halfLeading(17),
    paddingBottom: px(6) - halfLeading(17),
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
    top: H1_LINE_TWO_TOP,
    left: H1_LEFT,
    // The concept lets the marker slab run all the way to the frame, and in
    // Portuguese it very nearly does; a locale that needs more shrinks the
    // word inside the slab rather than pushing the keyline off the card.
    width: CARD_WIDTH - H1_LEFT,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  // The concept's marker highlight: a pink slab, hard black keyline, knocked
  // a couple of degrees off level so it reads as drawn on rather than typeset.
  marker: {
    flexShrink: 1,
    paddingHorizontal: MARKER_PAD_X + MARKER_BORDER,
    transform: [{ rotate: "-2deg" }],
  },
  markerSlab: {
    position: "absolute",
    left: 0,
    right: 0,
    top: MARKER_SLAB_TOP,
    height: MARKER_HEIGHT,
    backgroundColor: DM.edge,
    borderWidth: MARKER_BORDER,
    borderColor: INK,
  },
  scribble: {
    position: "absolute",
    top: SCRIBBLE.top,
    right: SCRIBBLE.right,
    // Shrinks to the line, so the arc under it always starts where the text
    // does. The cap is a backstop for a name long enough to walk the line off
    // the left edge of the card, nothing a real name reaches.
    maxWidth: SCRIBBLE.maxWidth,
    alignItems: "flex-start",
    transform: [{ rotate: "9deg" }],
  },
  scribbleText: { fontSize: SCRIBBLE.size, color: INK },
  scribbleRule: {
    marginTop: SCRIBBLE.ruleTop,
    transform: [{ rotate: "-5deg" }],
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
  typingPill: {
    position: "absolute",
    left: TYPING.left,
    top: TYPING.top,
    width: TYPING.width,
    height: TYPING.height,
    borderRadius: TYPING.radius,
    borderWidth: TYPING.border,
    borderColor: INK,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: TYPING.padLeft,
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
  typingLabel: {
    position: "absolute",
    left: SEEN.left,
    top: SEEN.top,
    fontSize: SEEN.size,
    letterSpacing: SEEN.tracking,
    color: INK,
  },
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
    // over it, and stops short of the arrow button whatever the dog is
    // called: `e fale com Maximiliano Ferreira` needs 617 of the 798 concept
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
  arrowCircle: {
    position: "absolute",
    right: ARROW_RIGHT,
    top: ARROW_TOP,
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    borderWidth: ARROW_BORDER,
    borderColor: INK,
    backgroundColor: DM.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowGlyph: {
    fontSize: ARROW_GLYPH,
    color: INK,
    transform: [{ translateY: ARROW_NUDGE }],
  },
}));
