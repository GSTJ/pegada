import type { StoryVariantProps } from "../types";

import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

import { CARD_HEIGHT, CARD_WIDTH } from "../../story-card-styles";
import {
  DISPLAY_TRACKING,
  EYEBROW_TRACKING,
  INK,
  TICKET,
  WHITE,
} from "../constants";
import { pickByGender } from "../gender";
import { mosaicSlots, stampSlot } from "../photos";
import {
  DashedRule,
  DotField,
  PawMark,
  PhotoMosaic,
  StoryImage,
} from "../primitives";

/**
 * Concept 02, "Rolê ticket", at a third of the concept's 1080x1920 grid —
 * same scaling contract as `dm-aberta.tsx`.
 */

/** The stub itself. Everything inside is positioned against this box. */
const TICKET_BOX = {
  left: 23.3,
  top: 86.7,
  width: 313.3,
  height: 465,
  border: 2,
};

/** Left/right gutter inside the stub, from the concept's 38px / 36px. */
const PAD_LEFT = 12.7;
const PAD_RIGHT = 12;
const CONTENT_WIDTH = TICKET_BOX.width - PAD_LEFT - PAD_RIGHT;

/** Half-circle tears, clipped by the stub's own `overflow: hidden`. */
const NOTCH = 22.7;

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
        spacing={9.3}
        radius={0.6}
        color={TICKET.dot}
        opacity={0.32}
        style={styles.dots}
      />
      <View style={[styles.stripe, styles.stripePink]} />
      <View style={[styles.stripe, styles.stripeYellow]} />

      <View style={styles.ticket}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={[styles.notch, styles.notchRight]} />

        <View style={styles.rail}>
          <View style={styles.railBrand}>
            <PawMark size={11.3} color={INK} />
            <Text fontWeight="black" style={styles.railText}>
              pegada.app
            </Text>
          </View>
          <Text fontWeight="black" style={styles.railText}>
            {t("dogShare.story.roleTicket.rail")}
          </Text>
          <Text fontWeight="black" style={styles.railText}>
            {t("dogShare.story.roleTicket.serial")}
          </Text>
        </View>

        {/* Three lines, the middle one carrying the pink accent word as a
            nested `Text` so `adjustsFontSizeToFit` measures the whole line at
            once — a two-`View` row would let the halves shrink independently
            and break the shared baseline. */}
        <View style={styles.title}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            fontWeight="black"
            style={styles.titleText}
          >
            {t("dogShare.story.roleTicket.headline1")}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            fontWeight="black"
            style={styles.titleText}
          >
            {t("dogShare.story.roleTicket.headline2")}{" "}
            <Text style={styles.titleAccent}>
              {t("dogShare.story.roleTicket.headline3")}
            </Text>
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            fontWeight="black"
            style={styles.titleText}
          >
            {t("dogShare.story.roleTicket.headline4")}
          </Text>
        </View>

        <Text numberOfLines={6} fontWeight="semibold" style={styles.fineprint}>
          {t("dogShare.story.roleTicket.fineprint")}
        </Text>

        {plan.isEmpty ? (
          <View style={[styles.band, styles.emptyBand]}>
            <PawMark size={44} color={TICKET.cream} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
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
            gutter={6.9}
            gutterColor={TICKET.cream}
            fallbackColor={TICKET.navy}
            style={styles.band}
          />
        )}
        {/* Strip of tape over the seam between the two band photos. */}
        <View style={styles.tape} />

        <View style={styles.meta}>
          <DashedRule width={CONTENT_WIDTH} thickness={1.3} />
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
          <DashedRule width={CONTENT_WIDTH} thickness={1.3} />
        </View>

        <View style={styles.call}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            fontWeight="black"
            style={styles.callText}
          >
            {t("dogShare.story.roleTicket.call", { name })}
          </Text>
          <View style={styles.callMark}>
            <Text
              fontWeight="black"
              style={[styles.callText, styles.callMarkText]}
            >
              {t("dogShare.story.roleTicket.callMark")}
            </Text>
          </View>
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
          <Text fontWeight="black" style={styles.ctaArrow}>
            →
          </Text>
        </View>
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
    top: -20,
    height: CARD_HEIGHT + 40,
    transform: [{ skewX: "-8deg" }],
  },
  stripePink: { left: 263.3, width: 31.7, backgroundColor: TICKET.stripePink },
  stripeYellow: {
    left: 301.7,
    width: 12,
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
    borderWidth: TICKET_BOX.border,
    borderColor: INK,
    overflow: "hidden",
    transform: [{ rotate: "-1deg" }],
  },
  notch: {
    position: "absolute",
    zIndex: 5,
    top: 300,
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: TICKET.navy,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  rail: {
    height: 28,
    backgroundColor: TICKET.rail,
    borderBottomWidth: 1.7,
    borderBottomColor: INK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 11.3,
  },
  railBrand: { flexDirection: "row", alignItems: "center", gap: 3.7 },
  railText: {
    fontSize: 7,
    letterSpacing: EYEBROW_TRACKING * 0.9,
    color: INK,
    textTransform: "uppercase",
  },
  title: { position: "absolute", left: PAD_LEFT, top: 38.7, width: 215 },
  titleText: {
    fontSize: 35,
    lineHeight: 29.4,
    letterSpacing: DISPLAY_TRACKING,
    color: INK,
    textTransform: "uppercase",
  },
  // The concept sets "um" in pink with a hard offset drop shadow. RN has no
  // text stroke, so the shadow alone carries the cut-out effect.
  //
  // The size is repeated rather than inherited: `@/components/text` applies
  // its own `fontSize` variant on every instance, so a nested `Text` would
  // otherwise drop to the theme's default body size mid-headline.
  titleAccent: {
    fontSize: 35,
    lineHeight: 29.4,
    letterSpacing: DISPLAY_TRACKING,
    color: TICKET.stripePink,
    textShadowColor: INK,
    textShadowOffset: { width: 1.7, height: 1.7 },
    textShadowRadius: 0,
  },
  fineprint: {
    position: "absolute",
    top: 45,
    right: PAD_RIGHT,
    width: 63.3,
    fontSize: 6.7,
    lineHeight: 7.6,
    letterSpacing: 0.4,
    color: INK,
    textTransform: "uppercase",
  },
  band: {
    position: "absolute",
    top: 136,
    left: PAD_LEFT,
    width: CONTENT_WIDTH,
    height: 158.3,
    borderWidth: 1.7,
    borderColor: INK,
  },
  emptyBand: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: TICKET.navy,
  },
  emptyName: {
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: DISPLAY_TRACKING,
    color: TICKET.cream,
    textTransform: "uppercase",
    maxWidth: 230,
  },
  tape: {
    position: "absolute",
    zIndex: 3,
    top: 130.7,
    right: 47.3,
    width: 41.3,
    height: 11.3,
    backgroundColor: TICKET.stripePink,
    transform: [{ rotate: "4deg" }],
  },
  meta: {
    position: "absolute",
    left: PAD_LEFT,
    top: 302.7,
    width: CONTENT_WIDTH,
  },
  metaRow: { flexDirection: "row", paddingTop: 7.3, paddingBottom: 6.7 },
  metaCellOne: {
    flex: 1.1,
    borderRightWidth: 1,
    borderRightColor: INK,
    paddingRight: 7.3,
  },
  metaCellTwo: {
    flex: 1.4,
    borderRightWidth: 1,
    borderRightColor: INK,
    paddingHorizontal: 7.3,
  },
  metaCellThree: { flex: 0.7, paddingLeft: 7.3 },
  metaLabel: {
    fontSize: 5,
    letterSpacing: EYEBROW_TRACKING * 0.6,
    color: INK,
    textTransform: "uppercase",
  },
  metaName: { textTransform: "uppercase" },
  metaValue: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.2,
    color: INK,
  },
  call: { position: "absolute", left: PAD_LEFT, top: 355, width: 175 },
  callText: {
    fontSize: 23,
    lineHeight: 20.6,
    letterSpacing: -0.7,
    color: INK,
    textTransform: "uppercase",
  },
  callMark: {
    alignSelf: "flex-start",
    marginTop: 2,
    backgroundColor: TICKET.navy,
    paddingHorizontal: 5,
    paddingTop: 3,
    paddingBottom: 1.3,
    transform: [{ rotate: "-2deg" }],
  },
  callMarkText: { color: WHITE },
  stampPhoto: {
    position: "absolute",
    top: 360.7,
    right: PAD_LEFT,
    width: 61.7,
    height: 53.3,
    borderWidth: 1.3,
    borderColor: INK,
    overflow: "hidden",
    transform: [{ rotate: "4deg" }],
  },
  stampPhotoImage: { width: "100%", height: "100%" },
  ctaBar: {
    position: "absolute",
    left: PAD_LEFT,
    right: PAD_LEFT,
    bottom: 11.3,
    height: 27.3,
    borderWidth: 1.7,
    borderColor: INK,
    backgroundColor: TICKET.stripePink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5.3,
  },
  ctaText: { fontSize: 10.3, letterSpacing: -0.2, color: INK },
  ctaArrow: { fontSize: 15, lineHeight: 17, color: INK },
  stampBadge: {
    position: "absolute",
    zIndex: 3,
    right: 14,
    top: 95.3,
    width: 41.3,
    height: 41.3,
    borderRadius: 20.65,
    borderWidth: 1.7,
    borderColor: INK,
    backgroundColor: TICKET.navy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    transform: [{ rotate: "9deg" }],
  },
  stampBadgeText: {
    width: 33,
    fontSize: 6,
    lineHeight: 6.8,
    textAlign: "center",
    color: TICKET.cream,
    textTransform: "uppercase",
  },
}));
