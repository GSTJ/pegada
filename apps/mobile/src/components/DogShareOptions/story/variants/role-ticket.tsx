import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { CARD_HEIGHT, CARD_WIDTH } from "../../story-card-styles";
import {
  CAP_LINE,
  INK,
  TICKET,
  WHITE,
  capTop,
  halfLeading,
  lineBox,
  px,
} from "../constants";
import { pickByGender } from "../gender";
import { mosaicSlots, stampSlot } from "../photos";
import {
  BrandLockup,
  DashedRule,
  DotField,
  MarkerSlab,
  PawMark,
  PhotoMosaic,
  StoryImage,
  TicketOutline,
} from "../primitives";

/**
 * Concept 02, "Rolê ticket" — same contract as `dm-aberta.tsx`: every number
 * is the concept's own passed through `px`, and every run of type that stands
 * on its own line is positioned by its cap line off the font's natural line
 * box. The exceptions are the three runs that have to wrap inside a fixed
 * space (the fine print, the call and the stamp), which keep a tighter
 * leading and are positioned by their box instead.
 */

/** `.ticket`: `left:70px; top:260px`, 940x1395, a 6px keyline, `rotate(-1deg)`. */
const TICKET_BOX = {
  left: px(70),
  top: px(260),
  width: px(940),
  height: px(1395),
  border: px(6),
};

/** Left and right gutters inside the stub, from the concept's 38px / 36px. */
const PAD_LEFT = px(38);
const PAD_RIGHT = px(36);
const CONTENT_WIDTH =
  TICKET_BOX.width - TICKET_BOX.border * 2 - PAD_LEFT - PAD_RIGHT;

/**
 * `.ticket:before/:after`: 68px tear circles centred on the stub's edges, 940px
 * down it.
 *
 * They are a hole, not a sticker: the background colour fills a circle whose
 * centre sits exactly ON the stub's edge, the stub's `overflow: hidden` keeps
 * the outer half of it, and `TicketOutline` draws the stub's own keyline
 * curving around the bite rather than running straight past it. That is why
 * the stub carries no `border` of its own — a border would clip the circle a
 * keyline's width inside the edge and leave a flat chord instead of a half
 * circle.
 */
/** `top:940px` measures the bordered circle's own box from inside the stub's
 *  6px keyline, so its centre is 940 + 40 down from there and the bite the
 *  background shows through is the 68px circle inside that border: r = 34. */
const NOTCH = { radius: px(34), centreY: px(6 + 940 + 40) };

/** `.rail`: 84px tall, a 5px rule under it, 34px of gutter, 22px eyebrows. */
const RAIL = {
  height: px(84),
  border: px(5),
  padX: px(34),
  size: px(22),
  tracking: px(3),
  mark: px(36),
  gap: px(13),
  serial: px(20),
};

/** `.title`: `left:38px; top:116px`, 105px on a .84 line box, `letter-spacing:-4px`. */
const TITLE_SIZE = px(105);
const TITLE_TRACKING = px(-4);
/**
 * Each line is placed by its own cap line rather than stacked: the concept's
 * .84 leading is far tighter than any box iOS will lay out, and pulling the
 * lines back together with a negative margin means trusting the height
 * `UIFont` reports for that box — which is a few points short of what the
 * font's metrics say, and crushed the three lines into each other.
 *
 * The first cap line is the concept's `top:116px` plus the half-leading a
 * browser puts above a run and iOS does not; the rest are 105 x .84 apart.
 */
const TITLE_CAP_ONE = 116 + (105 * (0.84 - 1.292)) / 2 + 105 * 0.4;
const TITLE_TOPS = [0, 1, 2].map((line) =>
  capTop(TITLE_CAP_ONE + line * 105 * 0.84, 105),
);

/** `.micro`: `top:135px; right:34px`, 190px wide, 20px on a 1.1 line box. */
const MICRO = {
  top: px(135),
  right: px(34),
  width: px(190),
  size: px(20),
  line: px(22),
  tracking: px(1.5),
};

/**
 * `.photo-a` / `.photo-b`: a 515px hero and a 330px portrait, each with its
 * own 5px keyline and a 9px gap between them, filling `top:408px` to 883.
 * The app tiles the same band for one to four photos (`photos.ts`), so the
 * keyline goes on every pane rather than around the band.
 */
const BAND = {
  top: px(408),
  height: px(475),
  border: px(5),
  gutter: px(9),
};

/** `.tape`: the strip of tape over the seam between the two prints. */
const TAPE = {
  top: px(392),
  right: px(142),
  width: px(124),
  height: px(34),
};

/** `.meta`: the perforated field row, `top:908px`, 4px dashed rules. A
 *  browser draws a 4px dashed border as an 8px dash over a 4px gap; the card
 *  was drawing 21 over 15, which reads as a tear-off, not a perforation. */
const META = {
  top: px(908),
  rule: px(4),
  dash: px(8),
  dashGap: px(4),
  padTop: px(22),
  padBottom: px(20),
  cellPad: px(22),
  cellRule: px(3),
  labelSize: px(15),
  labelTracking: px(2),
  valueSize: px(30),
  valueGap: px(6),
};

/**
 * `.call`: the concept sets this at 69px on a .88 line box.
 *
 * The card runs it at 60 instead, and starts it right under the perforation
 * rather than centred in the gap. The concept only ever has to fit `Nina
 * chamou.` on one line; a dog called Maximiliano Ferreira takes two, and two
 * lines plus the accent slab at 69px would run straight through the CTA bar.
 * 60 is the largest size where the two-line case still clears it.
 */
const CALL_SIZE = px(60);
const CALL_LINE = CALL_SIZE * 1.3;
const CALL_TOP = px(1026);
/** `.call span`: `background:#162348; padding:9px 15px 4px`, `rotate(-2deg)`.
 *  Padded evenly here for the same reason as the DM card's marker slab, and
 *  sized off the word rather than off a constant. */
const CALL_CAP = CALL_SIZE * 0.7;
const CALL_MARK_PAD_X = px(15);
const CALL_MARK_PAD_Y = px(7);
const CALL_MARK_TOP = CAP_LINE * CALL_SIZE - CALL_MARK_PAD_Y;

/** `.mini`: the tilted print stuck over the bottom right of the stub. */
const MINI = {
  top: px(1082),
  right: px(38),
  width: px(185),
  height: px(160),
  border: px(4),
};

/** `.cta`: the pink bar across the foot of the stub. */
const CTA_CONCEPT_SIZE = 31;
const CTA = {
  bottom: px(34),
  height: px(82),
  border: px(5),
  size: px(CTA_CONCEPT_SIZE),
  tracking: px(0.5),
};

/** `.corner`: the round stamp overlapping the stub's top right, on the card's
 *  own frame rather than the stub's. */
const STAMP = {
  top: px(286),
  right: px(42),
  size: px(124),
  border: px(5),
  fontSize: px(18),
  padX: px(5),
};

export const RoleTicketVariant = ({
  plan,
  name,
  gender,
  onImageSettled,
}: StoryVariantProps) => {
  const { t } = useTranslation();

  const stamp = stampSlot(plan);
  const passengerLabel = t(
    pickByGender(
      gender,
      "dogShare.story.roleTicket.passengerMale",
      "dogShare.story.roleTicket.passengerFemale",
    ),
  );

  return (
    <View style={styles.root}>
      <DotField
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        spacing={px(28)}
        radius={px(1.7)}
        color={TICKET.dot}
        opacity={0.32}
        style={styles.dots}
      />
      <View style={[styles.stripe, styles.stripePink]} />
      <View style={[styles.stripe, styles.stripeYellow]} />

      <View style={styles.ticket}>
        <View style={styles.ticketInner}>
          <View style={styles.rail}>
            <BrandLockup
              markHeight={RAIL.mark}
              gap={RAIL.gap}
              fontSize={RAIL.size}
              tracking={RAIL.tracking}
              uppercase
            />
            <Text fontWeight="black" style={styles.railText}>
              {t("dogShare.story.roleTicket.rail")}
            </Text>
            <Text fontWeight="black" style={styles.railSerial}>
              {t("dogShare.story.roleTicket.serial")}
            </Text>
          </View>

          {/* Three lines, the middle one carrying the pink accent word as a
            nested `Text` so both halves share one line box and one baseline;
            a two-`View` row would let them drift apart. */}
          <Text
            numberOfLines={1}
            fontWeight="black"
            style={[styles.titleText, styles.titleLineOne]}
          >
            {t("dogShare.story.roleTicket.headline1")}
          </Text>
          <Text
            numberOfLines={1}
            fontWeight="black"
            style={[styles.titleText, styles.titleLineTwo]}
          >
            {t("dogShare.story.roleTicket.headline2")}{" "}
            <Text fontWeight="black" style={styles.titleAccent}>
              {t("dogShare.story.roleTicket.headline3")}
            </Text>
          </Text>
          <Text
            numberOfLines={1}
            fontWeight="black"
            style={[styles.titleText, styles.titleLineThree]}
          >
            {t("dogShare.story.roleTicket.headline4")}
          </Text>

          <Text
            numberOfLines={6}
            fontWeight="semibold"
            style={styles.fineprint}
          >
            {t("dogShare.story.roleTicket.fineprint")}
          </Text>

          {plan.isEmpty ? (
            <View style={[styles.band, styles.emptyBand]}>
              <PawMark size={44} color={TICKET.cream} />
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
          ) : (
            <PhotoMosaic
              slots={mosaicSlots(plan)}
              onSettle={onImageSettled}
              gutter={BAND.gutter}
              gutterColor={TICKET.cream}
              paneBorder={BAND.border}
              fallbackColor={TICKET.navy}
              style={styles.band}
            />
          )}
          {/* Strip of tape over the seam between the two band photos. */}
          <View style={styles.tape} />

          <View style={styles.meta}>
            <DashedRule
              width={CONTENT_WIDTH}
              dash={META.dash}
              gap={META.dashGap}
              thickness={META.rule}
            />
            <View style={styles.metaRow}>
              <View style={styles.metaCellOne}>
                <Text
                  numberOfLines={1}
                  fontWeight="black"
                  style={styles.metaLabel}
                >
                  {passengerLabel}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  fontWeight="black"
                  style={[styles.metaValue, styles.metaName]}
                >
                  {name}
                </Text>
              </View>
              <View style={styles.metaCellTwo}>
                <Text
                  numberOfLines={1}
                  fontWeight="black"
                  style={styles.metaLabel}
                >
                  {t("dogShare.story.roleTicket.destination")}
                </Text>
                <Text
                  numberOfLines={1}
                  fontWeight="black"
                  style={styles.metaValue}
                >
                  {t("dogShare.story.roleTicket.destinationValue")}
                </Text>
              </View>
              <View style={styles.metaCellThree}>
                <Text
                  numberOfLines={1}
                  fontWeight="black"
                  style={styles.metaLabel}
                >
                  {t("dogShare.story.roleTicket.gate")}
                </Text>
                <Text
                  numberOfLines={1}
                  fontWeight="black"
                  style={styles.metaValue}
                >
                  {t("dogShare.story.roleTicket.gateValue")}
                </Text>
              </View>
            </View>
            <DashedRule
              width={CONTENT_WIDTH}
              dash={META.dash}
              gap={META.dashGap}
              thickness={META.rule}
            />
          </View>

          <View style={styles.call}>
            {/* Wraps rather than auto-shrinking: a long name that shrank to
              fit one line would end up set smaller than the boxed accent
              directly under it, which reads as a mistake. */}
            <Text numberOfLines={2} fontWeight="black" style={styles.callText}>
              {t("dogShare.story.roleTicket.call", { name })}
            </Text>
            <MarkerSlab
              fontSize={CALL_SIZE}
              capHeight={CALL_CAP}
              padX={CALL_MARK_PAD_X}
              padY={CALL_MARK_PAD_Y}
              border={0}
              fill={TICKET.navy}
              textStyle={[styles.callText, styles.callMarkText]}
              style={styles.callMark}
            >
              {t("dogShare.story.roleTicket.callMark")}
            </MarkerSlab>
          </View>

          {stamp ? (
            <View style={styles.stampPhoto}>
              <StoryImage
                photo={stamp.photo}
                onSettle={onImageSettled}
                fallbackColor={TICKET.navy}
                style={styles.stampPhotoImage}
              />
            </View>
          ) : null}

          <View style={styles.ctaBar}>
            <Text numberOfLines={1} fontWeight="black" style={styles.ctaText}>
              {t("dogShare.story.roleTicket.cta")}
            </Text>
          </View>
        </View>

        {/* The bites and the keyline that curves into them, over everything
            else so the stub's own edge is what the eye follows. */}
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={[styles.notch, styles.notchRight]} />
        <TicketOutline
          width={TICKET_BOX.width}
          height={TICKET_BOX.height}
          stroke={TICKET_BOX.border}
          notchRadius={NOTCH.radius}
          notchY={NOTCH.centreY}
          style={styles.ticketOutline}
        />
      </View>

      <View style={styles.stampBadge}>
        <Text fontWeight="black" style={styles.stampBadgeText}>
          {t("dogShare.story.roleTicket.stamp")}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create(() => ({
  root: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: TICKET.navy,
    overflow: "hidden",
  },
  dots: { position: "absolute", top: 0, left: 0 },
  stripe: {
    position: "absolute",
    top: 0,
    height: CARD_HEIGHT,
    transform: [{ skewX: "-8deg" }],
  },
  stripePink: {
    left: px(790),
    width: px(95),
    backgroundColor: TICKET.stripePink,
  },
  stripeYellow: {
    left: px(905),
    width: px(36),
    backgroundColor: TICKET.stripeYellow,
  },
  ticket: {
    position: "absolute",
    zIndex: 2,
    left: TICKET_BOX.left,
    top: TICKET_BOX.top,
    width: TICKET_BOX.width,
    height: TICKET_BOX.height,
    backgroundColor: TICKET.cream,
    // No border: `overflow: hidden` clips to the padding box, so a border
    // would cut the notch circles a keyline inside the stub's edge and leave
    // them flat-sided. The keyline is drawn by `TicketOutline` instead, which
    // can take the bites out of it.
    overflow: "hidden",
    transform: [{ rotate: "-1deg" }],
  },
  // Everything the stub holds, inset by the keyline the outline draws, so
  // each element keeps the offset the concept measures from inside the border.
  ticketInner: {
    position: "absolute",
    top: TICKET_BOX.border,
    left: TICKET_BOX.border,
    right: TICKET_BOX.border,
    bottom: TICKET_BOX.border,
  },
  ticketOutline: { position: "absolute", zIndex: 6, top: 0, left: 0 },
  notch: {
    position: "absolute",
    zIndex: 5,
    top: NOTCH.centreY - NOTCH.radius,
    width: NOTCH.radius * 2,
    height: NOTCH.radius * 2,
    borderRadius: NOTCH.radius,
    backgroundColor: TICKET.navy,
  },
  notchLeft: { left: -NOTCH.radius },
  notchRight: { right: -NOTCH.radius },
  rail: {
    height: RAIL.height,
    backgroundColor: TICKET.rail,
    borderBottomWidth: RAIL.border,
    borderBottomColor: INK,
    flexDirection: "row",
    // Hung off the top rather than centred: `UIFont` reports a line box a few
    // points shorter than Gilroy's metrics say, so `align-items: center` puts
    // the eyebrows somewhere only the device can predict. This is where the
    // concept's own centring lands them, worked out from the numbers.
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: RAIL.padX,
    paddingTop: (RAIL.height - RAIL.border - lineBox(RAIL.size)) / 2,
  },
  // The mark hangs off the top of the rail's line box and the words off their
  // caps, which is a half-leading further down.
  railText: {
    marginTop: halfLeading(22),
    fontSize: RAIL.size,
    letterSpacing: RAIL.tracking,
    color: INK,
    textTransform: "uppercase",
  },
  railSerial: {
    marginTop: halfLeading(20),
    fontSize: RAIL.serial,
    letterSpacing: px(2),
    color: INK,
    textTransform: "uppercase",
  },
  titleLineOne: { position: "absolute", left: PAD_LEFT, top: TITLE_TOPS[0] },
  titleLineTwo: { position: "absolute", left: PAD_LEFT, top: TITLE_TOPS[1] },
  titleLineThree: { position: "absolute", left: PAD_LEFT, top: TITLE_TOPS[2] },
  titleText: {
    fontSize: TITLE_SIZE,
    letterSpacing: TITLE_TRACKING,
    color: INK,
    textTransform: "uppercase",
  },
  // The concept sets "um" in pink with a 2px stroke and a hard offset drop
  // shadow. RN has no text stroke, so the shadow alone carries the cut-out.
  //
  // The size is repeated rather than inherited: `@/components/text` applies
  // its own `fontSize` variant on every instance, so a nested `Text` would
  // otherwise drop to the theme's default body size mid-headline.
  titleAccent: {
    fontSize: TITLE_SIZE,
    letterSpacing: TITLE_TRACKING,
    color: TICKET.stripePink,
    textShadowColor: INK,
    textShadowOffset: { width: px(5), height: px(5) },
    textShadowRadius: 0,
  },
  /**
   * Four wrapped lines in a 190px column, so this keeps the concept's own 1.1
   * leading rather than the font's line box — at the font's box it would run
   * a third taller and reach the photo band.
   */
  fineprint: {
    position: "absolute",
    top: MICRO.top,
    right: MICRO.right,
    width: MICRO.width,
    fontSize: MICRO.size,
    lineHeight: MICRO.line,
    letterSpacing: MICRO.tracking,
    color: INK,
    textTransform: "uppercase",
  },
  band: {
    position: "absolute",
    top: BAND.top,
    left: PAD_LEFT,
    width: CONTENT_WIDTH,
    height: BAND.height,
  },
  emptyBand: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: BAND.border,
    borderColor: INK,
    backgroundColor: TICKET.navy,
  },
  /**
   * Same fix as `dm-aberta`'s own `emptyName`, for the same reason: iOS skips
   * `adjustsFontSizeToFit` on a label with an explicit `lineHeight`, and a
   * `maxWidth` clips the measured label instead of giving the shrink a box to
   * resolve against, so a long name was cut off mid letter. 265 is the band's
   * inner width less an even gutter either side.
   */
  emptyName: {
    fontSize: 26,
    letterSpacing: px(-4),
    color: TICKET.cream,
    textTransform: "uppercase",
    textAlign: "center",
    width: 265,
  },
  tape: {
    position: "absolute",
    zIndex: 3,
    top: TAPE.top,
    right: TAPE.right,
    width: TAPE.width,
    height: TAPE.height,
    backgroundColor: TICKET.stripePink,
    transform: [{ rotate: "4deg" }],
  },
  meta: {
    position: "absolute",
    left: PAD_LEFT,
    top: META.top,
    width: CONTENT_WIDTH,
  },
  metaRow: {
    flexDirection: "row",
    paddingTop: META.padTop,
    paddingBottom: META.padBottom,
  },
  metaCellOne: {
    flex: 1.1,
    borderRightWidth: META.cellRule,
    borderRightColor: INK,
    paddingRight: META.cellPad,
  },
  metaCellTwo: {
    flex: 1.4,
    borderRightWidth: META.cellRule,
    borderRightColor: INK,
    paddingHorizontal: META.cellPad,
  },
  metaCellThree: { flex: 0.7, paddingLeft: META.cellPad },
  metaLabel: {
    fontSize: META.labelSize,
    letterSpacing: META.labelTracking,
    color: INK,
    textTransform: "uppercase",
  },
  metaName: { textTransform: "uppercase" },
  metaValue: {
    marginTop: META.valueGap,
    fontSize: META.valueSize,
    color: INK,
  },
  call: { position: "absolute", left: PAD_LEFT, top: CALL_TOP, width: px(639) },
  callText: {
    fontSize: CALL_SIZE,
    lineHeight: CALL_LINE,
    letterSpacing: px(-2),
    color: INK,
    textTransform: "uppercase",
  },
  callMark: {
    marginTop: CALL_MARK_TOP,
    transform: [{ rotate: "-2deg" }],
  },
  callMarkText: { color: WHITE },
  stampPhoto: {
    position: "absolute",
    top: MINI.top,
    right: MINI.right,
    width: MINI.width,
    height: MINI.height,
    borderWidth: MINI.border,
    borderColor: INK,
    overflow: "hidden",
    transform: [{ rotate: "4deg" }],
  },
  stampPhotoImage: { width: "100%", height: "100%" },
  ctaBar: {
    position: "absolute",
    left: PAD_LEFT,
    right: PAD_LEFT,
    bottom: CTA.bottom,
    height: CTA.height,
    borderWidth: CTA.border,
    borderColor: INK,
    backgroundColor: TICKET.stripePink,
    alignItems: "center",
    paddingTop:
      (CTA.height - CTA.border * 2 - lineBox(CTA.size)) / 2 +
      halfLeading(CTA_CONCEPT_SIZE),
  },
  ctaText: {
    fontSize: CTA.size,
    letterSpacing: CTA.tracking,
    color: INK,
  },
  stampBadge: {
    position: "absolute",
    zIndex: 3,
    right: STAMP.right,
    top: STAMP.top,
    width: STAMP.size,
    height: STAMP.size,
    borderRadius: STAMP.size / 2,
    borderWidth: STAMP.border,
    borderColor: INK,
    backgroundColor: TICKET.navy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: STAMP.padX,
    transform: [{ rotate: "9deg" }],
  },
  /** Three wrapped lines inside a 124px circle, so it keeps the concept's own
   *  `line-height: 1` rather than the font's box. */
  stampBadgeText: {
    width: STAMP.size - STAMP.border * 2 - STAMP.padX * 2,
    fontSize: STAMP.fontSize,
    lineHeight: STAMP.fontSize,
    textAlign: "center",
    color: TICKET.cream,
    textTransform: "uppercase",
  },
}));
