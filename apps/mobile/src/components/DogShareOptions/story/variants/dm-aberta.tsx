import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { CARD_HEIGHT, CARD_WIDTH } from "../../story-card-styles";
import {
  DISPLAY_TRACKING,
  DM,
  EYEBROW_TRACKING,
  INK,
  WHITE,
} from "../constants";
import { pickByGender, pickByHash } from "../gender";
import { mosaicSlots } from "../photos";
import { BubbleTail, CheckerField, PawMark, PhotoMosaic } from "../primitives";

/**
 * Concept 06, "DM aberta", laid out at a third of the concept's own
 * 1080x1920 grid — the card renders at 360x640 points and `captureRef`
 * multiplies by the device pixel ratio back up to 1080x1920 (see
 * `story-card-styles.ts`). Every offset below is the concept's value divided
 * by three, so the shipped PNG and the concept render are the same artwork.
 */

/** Checker column down the right edge, bleeding past the safe area. */
const CHECKER_WIDTH = 110;
const CHECKER_CELL = 10.6;
/** Pink rule down the left edge, also full bleed. */
const EDGE_BAR = 8;

const BUBBLE = {
  left: 21.3,
  top: 230,
  width: 253.3,
  height: 213.3,
  border: 2,
  padding: 6,
  radius: 46.7,
  /** The one square corner, where the tail hangs off. */
  cornerRadius: 6,
};

const TAIL_SIZE = 29.3;

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

      <View style={styles.brand}>
        <PawMark size={13.3} color={INK} />
        <Text fontWeight="black" style={styles.brandText}>
          pegada.app
        </Text>
      </View>

      <View style={styles.onlineBadge}>
        <View style={styles.onlineDot} />
        <Text fontWeight="black" style={styles.onlineText}>
          {t("dogShare.story.dmAberta.online")}
        </Text>
      </View>

      <View style={styles.headline}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          fontWeight="black"
          style={styles.headlineText}
        >
          {t("dogShare.story.dmAberta.headline1")}
        </Text>
        {/* The marker slab runs to within a few points of the card's right
            edge, as in the concept. It shrinks rather than clipping, so a
            longer word in another locale loses a couple of points of type
            instead of losing its own keyline off the frame. */}
        <View style={styles.headlineRow}>
          <Text fontWeight="black" style={styles.headlineText}>
            {t("dogShare.story.dmAberta.headline2")}{" "}
          </Text>
          <View style={styles.marker}>
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
      </View>

      <View style={styles.scribble}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          fontWeight="black"
          style={styles.scribbleText}
        >
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
          size={TAIL_SIZE}
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

      <View style={styles.cta}>
        <Text numberOfLines={1} fontWeight="black" style={styles.ctaLine}>
          {t("dogShare.story.footerCta")}
        </Text>
        <View style={styles.ctaUnderlined}>
          <Text numberOfLines={1} fontWeight="black" style={styles.ctaLineMark}>
            {t("dogShare.story.dmAberta.ctaLine2")} ↗
          </Text>
        </View>
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
  brand: {
    position: "absolute",
    top: 92.7,
    left: 21.7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4.3,
  },
  brandText: { fontSize: 9.5, color: INK, letterSpacing: -0.2 },
  onlineBadge: {
    position: "absolute",
    top: 95,
    right: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 2.7,
    backgroundColor: INK,
    paddingHorizontal: 4.3,
    paddingVertical: 2.6,
  },
  onlineDot: {
    width: 3.7,
    height: 3.7,
    borderRadius: 1.85,
    backgroundColor: DM.lime,
  },
  onlineText: {
    fontSize: 6,
    color: WHITE,
    letterSpacing: EYEBROW_TRACKING * 0.6,
    textTransform: "uppercase",
  },
  headline: {
    position: "absolute",
    top: 116,
    left: 19.3,
    // Runs to 4pt off the card's right edge — the concept lets the marker
    // slab all but touch the frame.
    width: CARD_WIDTH - 19.3 - 4,
    zIndex: 4,
  },
  headlineRow: { flexDirection: "row", alignItems: "center" },
  headlineText: {
    fontSize: 39.3,
    lineHeight: 32.5,
    letterSpacing: DISPLAY_TRACKING,
    color: INK,
    textTransform: "uppercase",
  },
  // The concept's marker highlight: a pink slab, hard black keyline, knocked
  // a couple of degrees off level so it reads as drawn on rather than typeset.
  marker: {
    flexShrink: 1,
    backgroundColor: DM.edge,
    borderWidth: 1.7,
    borderColor: INK,
    paddingHorizontal: 5.7,
    paddingTop: 3.5,
    paddingBottom: 1,
    transform: [{ rotate: "-2deg" }],
  },
  scribble: {
    position: "absolute",
    top: 200,
    right: 19.3,
    maxWidth: 150,
    alignItems: "flex-end",
    transform: [{ rotate: "9deg" }],
  },
  scribbleText: { fontSize: 10.3, color: INK },
  scribbleRule: {
    width: 60,
    height: 1.6,
    marginTop: 1.5,
    backgroundColor: INK,
    transform: [{ rotate: "-4deg" }],
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
    borderBottomLeftRadius: BUBBLE.cornerRadius,
  },
  bubbleInner: {
    flex: 1,
    overflow: "hidden",
    borderTopLeftRadius: BUBBLE.radius - BUBBLE.padding,
    borderTopRightRadius: BUBBLE.radius - BUBBLE.padding,
    borderBottomRightRadius: BUBBLE.radius - BUBBLE.padding,
    borderBottomLeftRadius: 1.5,
  },
  tail: {
    position: "absolute",
    left: -BUBBLE.border,
    bottom: -TAIL_SIZE + 7.3,
  },
  emptyPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DM.checker,
  },
  emptyName: {
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: DISPLAY_TRACKING,
    color: INK,
    textTransform: "uppercase",
    maxWidth: 200,
  },
  chatBubble: {
    position: "absolute",
    zIndex: 6,
    borderWidth: 1.7,
    borderColor: INK,
    paddingHorizontal: 7.3,
    paddingTop: 5.7,
    paddingBottom: 4.3,
  },
  chatBubbleOne: {
    top: 347.3,
    right: 17.3,
    width: 106.7,
    backgroundColor: DM.bubbleTeal,
    transform: [{ rotate: "2.5deg" }],
  },
  chatBubbleTwo: {
    top: 398.3,
    right: 24,
    width: 110,
    backgroundColor: DM.bubblePink,
    transform: [{ rotate: "-2deg" }],
  },
  chatText: { fontSize: 8.7, lineHeight: 9.6, color: INK },
  chatTime: {
    marginTop: 3.3,
    fontSize: 4.6,
    letterSpacing: 0.3,
    textAlign: "right",
    color: INK,
  },
  typingPill: {
    position: "absolute",
    left: 21.7,
    top: 465.7,
    width: 158.3,
    height: 23.3,
    borderRadius: 11.7,
    borderWidth: 1.7,
    borderColor: INK,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8.7,
    gap: 4,
  },
  typingDot: {
    width: 4.3,
    height: 4.3,
    borderRadius: 2.15,
    backgroundColor: INK,
  },
  typingDotMid: { opacity: 0.55 },
  typingDotLast: { opacity: 0.3 },
  typingLabel: {
    position: "absolute",
    left: 188.3,
    top: 472,
    width: 150,
    fontSize: 5.4,
    letterSpacing: 0.3,
    color: INK,
  },
  cta: { position: "absolute", left: 20.7, top: 507, width: 270 },
  ctaLine: { fontSize: 14, lineHeight: 15.5, letterSpacing: -0.5, color: INK },
  ctaUnderlined: {
    alignSelf: "flex-start",
    borderBottomWidth: 2.3,
    borderBottomColor: INK,
  },
  ctaLineMark: {
    fontSize: 14,
    lineHeight: 15.5,
    letterSpacing: -0.5,
    color: DM.ctaPink,
  },
  arrowCircle: {
    position: "absolute",
    right: 22.7,
    top: 504,
    width: 37.3,
    height: 37.3,
    borderRadius: 18.65,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: DM.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowGlyph: { fontSize: 20.7, lineHeight: 24, color: INK },
}));
