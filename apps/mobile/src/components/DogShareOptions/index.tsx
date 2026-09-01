import type { ShareableDog } from "./types";

import type { ComponentRef, ComponentType } from "react";

import { useRef, useState } from "react";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  PixelRatio,
  Share,
  View,
  useWindowDimensions,
} from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";

import { useTranslation } from "react-i18next";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import { magicToast } from "react-native-magic-toast";
import { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { captureRef } from "react-native-view-shot";

import Copy from "@/assets/images/Copy.svg";
import ShareIcon from "@/assets/images/Share.svg";
import Story from "@/assets/images/Story.svg";
import Divider from "@/components/divider";
import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";
import { APP_SHARE_LINK_BASE } from "@/constants";
import { sendError } from "@/services/error-tracking";

import { DogStoryCard } from "./story-card";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  EXPORT_PNG_HEIGHT,
  EXPORT_PNG_WIDTH,
} from "./story-card-styles";
import { styles } from "./styles";

type SvgIconProps = { width: number; height: number; fill: string };

const getDogShareLink = (dogId: string) =>
  `${APP_SHARE_LINK_BASE}/dog/${dogId}`;

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
        <Icon width={20} height={20} fill={theme.colors.primary} />
      </View>
      <Text fontWeight="medium" style={styles.rowLabel}>
        {label}
      </Text>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
    </PressableArea>
  );
};

const DogShareSheetContent = ({ dog }: { dog: ShareableDog }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { hide: hideModal } = useMagicModal();

  const [isSharingStory, setIsSharingStory] = useState(false);

  const storyCardRef = useRef<ComponentRef<typeof View>>(null);
  const hasHiddenRef = useRef(false);
  const photoReadyRef = useRef(!dog.images[0]?.url);
  const photoWaitersRef = useRef<(() => void)[]>([]);

  const [firstName] = dog.name.split(" ");
  const link = getDogShareLink(dog.id);

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

  const waitForPhoto = (timeoutMs = 3000) =>
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

  const shareLinkFallback = async () => {
    try {
      await Share.share({ message: t("dogProfile.shareLink", { link }) });
    } catch (error) {
      sendError(error);
      Alert.alert(
        t("dogProfile.sharingNotAvailableTitle"),
        t("dogProfile.sharingNotAvailableMessage", { name: dog.name }),
      );
    }
  };

  const handleShareLink = () => {
    hide();
    void shareLinkFallback();
  };

  const handleCopyLink = () => {
    hide();
    void (async () => {
      await Clipboard.setStringAsync(link);
      magicToast.success(t("dogShare.linkCopied"), 1500);
    })();
  };

  const handleShareStory = async () => {
    setIsSharingStory(true);

    try {
      const available = await Sharing.isAvailableAsync();

      if (!available) {
        magicToast.alert(t("dogShare.storyUnavailable"));
        hide();
        await shareLinkFallback();
        return;
      }

      await waitForPhoto();

      if (!storyCardRef.current) {
        throw new Error("Story card was not mounted for capture");
      }

      // `captureRef`'s `width`/`height` are in points, and iOS multiplies
      // them by the device's pixel ratio when rasterizing — passing the
      // target pixel size straight through would produce a PNG `scale`
      // times too large (3240x5760 at 12.7 MB on a 3x device instead of the
      // intended 1080x1920). Dividing by the ratio here lands on the exact
      // pixel size on any device.
      const scale = PixelRatio.get();
      const uri = await captureRef(storyCardRef, {
        width: EXPORT_PNG_WIDTH / scale,
        height: EXPORT_PNG_HEIGHT / scale,
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;

      hide();

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: t("dogProfile.shareProfile", { name: firstName }),
      });
    } catch (error) {
      sendError(error);
      magicToast.alert(t("dogShare.storyFailedFallback"));
      hide();
      await shareLinkFallback();
    } finally {
      setIsSharingStory(false);
    }
  };

  return (
    <View
      style={[styles.overlay, { paddingBottom: insets.bottom || undefined }]}
    >
      <View style={styles.sheet}>
        <Text
          fontWeight="semibold"
          fontSize="sm"
          color="subtitle"
          style={styles.title}
        >
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
        <Text fontWeight="bold">{t("dogProfile.cancel")}</Text>
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
 */
export const showDogShareOptions = (dog: ShareableDog) =>
  magicModal.show(() => <DogShareSheetContent dog={dog} />, {
    style: { justifyContent: "flex-end" },
    swipeDirection: "down",
    entering: FadeInDown.duration(220),
    exiting: FadeOutDown.duration(200),
  });
