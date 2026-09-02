import type { ShareableDog } from "./types";

import type { ComponentRef, ComponentType } from "react";

import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";

import { useTranslation } from "react-i18next";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import Copy from "@/assets/images/Copy.svg";
import Gift from "@/assets/images/Gift.svg";
import ShareIcon from "@/assets/images/Share.svg";
import Story from "@/assets/images/Story.svg";
import VideoCamera from "@/assets/images/VideoCamera.svg";
import Divider from "@/components/divider";
import { FakeDoorRow } from "@/components/FakeDoor";
import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";

import {
  buildDogShareLinkMessage,
  copyDogLink,
  getDogShareLink,
  shareDogLink,
  shareDogStory,
  trackDogShareCompleted,
  trackDogShareTapped,
  type ShareOption,
  type ShareSource,
} from "./share-actions";
import { DogStoryCard, STORY_SETTLE_TIMEOUT_MS } from "./story-card";
import { CARD_HEIGHT, CARD_WIDTH } from "./story-card-styles";
import { styles } from "./styles";

// Margin on top of the card's own settle timeout so this wait can never
// time out before `onPhotoSettled` has had a chance to fire — otherwise a
// slow network would make the capture race a card that hasn't given up yet.
const PHOTO_WAIT_MARGIN_MS = 500;

type SvgIconProps = { width: number; height: number; fill: string };

const ShareOptionRow = ({
  icon: Icon,
  label,
  onPress,
  disabled,
  loading,
  testID,
}: {
  icon: ComponentType<SvgIconProps>;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) => {
  const { theme } = useUnistyles();

  styles.useVariants({ disabled: Boolean(disabled) });

  return (
    <PressableArea
      testID={testID}
      // Without `accessible`, a Pressable wrapping a bare Text is not one
      // accessibility element on iOS 26 Fabric — see the note on
      // `PickerSelectItem` for the same fix.
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowIcon}>
        <Icon width={22} height={22} fill={theme.colors.text} />
      </View>
      <Text fontWeight="medium" fontSize="sm" style={styles.rowLabel}>
        {label}
      </Text>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
    </PressableArea>
  );
};

const DogShareSheetContent = ({
  dog,
  source,
}: {
  dog: ShareableDog;
  source: ShareSource;
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { hide: hideModal } = useMagicModal();

  const [isSharingStory, setIsSharingStory] = useState(false);

  const storyCardRef = useRef<ComponentRef<typeof View>>(null);
  const hasHiddenRef = useRef(false);
  const photoReadyRef = useRef(!dog.images[0]?.url);
  const photoWaitersRef = useRef<(() => void)[]>([]);

  // `hide()` fires well before `shareDogStory` resolves — it runs right
  // after the capture, while `Sharing.shareAsync` still has to wait on
  // whatever the user does with the native share sheet, which can take far
  // longer than the modal's own 200ms exit animation. By the time that
  // promise settles the sheet has almost certainly already unmounted, so
  // `handleShareStory`'s `finally` block needs this guard before touching
  // `isSharingStory` state.
  const isMountedRef = useRef(true);

  // Set by every row handler so the unmount cleanup can tell "opened the
  // sheet and backed out" from "opened it and picked something". Backing
  // out covers the Cancel pill, the backdrop and the swipe-down gesture in
  // one place, since all three end at the same unmount.
  const pickedOptionRef = useRef(false);

  useEffect(() => {
    // The denominator for every rate below: how many times the sheet was
    // opened at all. Fires once per mount, not once per render.
    trackDogShareTapped({ source, dogId: dog.id });

    return () => {
      isMountedRef.current = false;
      // Closing without picking a row is still an ending, so it gets its own
      // completion with no `option` rather than leaving the open unmatched.
      if (!pickedOptionRef.current) {
        trackDogShareCompleted("dismissed", { source, dogId: dog.id });
      }
    };
  }, [source, dog.id]);

  const [firstName] = dog.name.split(" ");
  const link = getDogShareLink(dog.id);

  const trackingFor = (option: ShareOption) => {
    pickedOptionRef.current = true;
    return { source, dogId: dog.id, option };
  };

  const hide = () => {
    if (hasHiddenRef.current) return;
    hasHiddenRef.current = true;
    hideModal();
  };

  const markPhotoSettled = () => {
    if (photoReadyRef.current) return;
    photoReadyRef.current = true;
    for (const resolve of photoWaitersRef.current) resolve();
    photoWaitersRef.current = [];
  };

  const waitForPhoto = (
    timeoutMs = STORY_SETTLE_TIMEOUT_MS + PHOTO_WAIT_MARGIN_MS,
  ) =>
    new Promise<void>((resolve) => {
      if (photoReadyRef.current) {
        resolve();
        return;
      }

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const timer = setTimeout(settle, timeoutMs);
      photoWaitersRef.current.push(() => {
        clearTimeout(timer);
        settle();
      });
    });

  const shareLinkMessage = buildDogShareLinkMessage(t, link);
  const sharingNotAvailableCopy = {
    title: t("dogProfile.sharingNotAvailableTitle"),
    message: t("dogProfile.sharingNotAvailableMessage", { name: dog.name }),
  };

  const handleShareLink = () => {
    const tracking = trackingFor("link");
    hide();
    void shareDogLink(shareLinkMessage, sharingNotAvailableCopy, tracking);
  };

  const handleCopyLink = () => {
    const tracking = trackingFor("copy_link");
    hide();
    void copyDogLink(
      link,
      {
        success: t("dogShare.linkCopied"),
        failure: t("dogShare.copyLinkFailed"),
      },
      tracking,
    );
  };

  const handleShareStory = async () => {
    const tracking = trackingFor("story");
    setIsSharingStory(true);

    try {
      await shareDogStory({
        storyCardRef,
        waitForPhoto,
        hide,
        dogName: dog.name,
        dialogTitle: t("dogProfile.shareProfile", { name: firstName }),
        shareLinkMessage,
        copy: {
          storyUnavailable: t("dogShare.storyUnavailable"),
          storyFailedFallback: t("dogShare.storyFailedFallback"),
          sharingNotAvailable: sharingNotAvailableCopy,
        },
        tracking,
        // The sheet keeps its swipe-to-dismiss gesture while the capture
        // runs, so "unmounted and it wasn't us who closed it" is exactly a
        // user dismissal. `hasHiddenRef` is what tells the two apart: the
        // happy path calls `hide()` itself right before handing off to the
        // native share sheet, and that unmount must not read as a cancel.
        isCancelled: () => !isMountedRef.current && !hasHiddenRef.current,
      });
    } finally {
      if (isMountedRef.current) setIsSharingStory(false);
    }
  };

  return (
    <View
      style={[styles.overlay, { paddingBottom: insets.bottom || undefined }]}
    >
      <View style={styles.sheet}>
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
        <Text fontWeight="medium" fontSize="lg" style={styles.title}>
          {t("dogProfile.shareProfile", { name: firstName })}
        </Text>
        <Divider style={styles.titleDivider} />
        <ShareOptionRow
          testID="dog-share-link"
          icon={ShareIcon}
          label={t("dogShare.shareLink")}
          onPress={handleShareLink}
          disabled={isSharingStory}
        />
        <Divider style={styles.rowDivider} />
        <ShareOptionRow
          testID="dog-share-copy-link"
          icon={Copy}
          label={t("dogShare.copyLink")}
          onPress={handleCopyLink}
          disabled={isSharingStory}
        />
        <Divider style={styles.rowDivider} />
        <ShareOptionRow
          testID="dog-share-story"
          icon={Story}
          label={t("dogShare.shareStory")}
          onPress={() => {
            void handleShareStory();
          }}
          disabled={isSharingStory}
          loading={isSharingStory}
        />
        {/* Fake doors, last and marked "em breve": everything above this
            divider works today, and the two below only measure whether they
            are worth building.

            Their icons come from the same Phosphor outline set as the three
            rows above rather than from the app's own solid glyphs: a filled
            crown and a filled dog drawn edge to edge in a 24pt box read
            heavier and larger than a 256pt outline mark at the same asked-for
            size, which put the loudest thing on the sheet next to the two
            options that do nothing.

            `dismissHost` closes this sheet before the "em breve" sheet
            opens. Without it the second sheet lands on top of the first,
            stacking two backdrops and slicing the "Copiar link" row with its
            own top edge. */}
        <Divider style={styles.rowDivider} />
        <FakeDoorRow
          testID="fake-door-referral"
          feature="referral_reward"
          source="share_sheet"
          icon={Gift}
          label={t("fakeDoor.referralReward")}
          disabled={isSharingStory}
          dismissHost={hide}
        />
        <Divider style={styles.rowDivider} />
        <FakeDoorRow
          testID="fake-door-ai-video"
          feature="ai_story_video"
          source="share_sheet"
          icon={VideoCamera}
          label={t("fakeDoor.aiStoryVideo", { name: firstName })}
          disabled={isSharingStory}
          dismissHost={hide}
        />
      </View>
      <PressableArea
        testID="dog-share-cancel"
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("dogProfile.cancel")}
        disabled={isSharingStory}
        onPress={hide}
        style={styles.cancelButton}
      >
        <Text fontWeight="bold" fontSize="lg">
          {t("dogProfile.cancel")}
        </Text>
      </PressableArea>

      {/* Offscreen capture target. Mounted for as long as this sheet is, so
          the ref stays valid through the whole async capture, including
          across `hide()` calls that happen for the other two rows — this
          component only unmounts when the sheet itself does. */}
      <View
        pointerEvents="none"
        style={[
          styles.offscreenHost,
          { left: width, width: CARD_WIDTH, height: CARD_HEIGHT },
        ]}
      >
        <DogStoryCard
          ref={storyCardRef}
          dog={dog}
          onPhotoSettled={markPhotoSettled}
        />
      </View>
    </View>
  );
};

/**
 * Opens the three-option share sheet — share link, copy link, share story —
 * for the given dog. The single entry point both the own-profile header and
 * other dogs' profile use, so the behaviour is identical in both places.
 * `source` only exists to split the analytics funnel by entry point; it
 * changes nothing about what the sheet renders or does.
 */
export const showDogShareOptions = (dog: ShareableDog, source: ShareSource) =>
  magicModal.show(() => <DogShareSheetContent dog={dog} source={source} />, {
    style: { justifyContent: "flex-end" },
    swipeDirection: "down",
    entering: FadeInDown.duration(220),
    exiting: FadeOutDown.duration(200),
  });
