import type {
  Picture,
  ProfileImageUploadStage,
} from "@/components/ProfileImageUploader/utils";

import { useEffect, useState } from "react";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";

import AddRemove from "@/assets/images/AddRemove.svg";
import { PressableArea } from "@/components/pressable-area";
import {
  getMaestroPlaceholderUri,
  ImagePickerError,
  shouldOfferMaestroPlaceholder,
  showImagePickerOptions,
  uploadProfileImage,
} from "@/components/ProfileImageUploader/utils";
import { Text } from "@/components/text";
import { sendError } from "@/services/error-tracking";

import {
  AddRemoveContainer,
  FadedDog,
  MaestroSkipPressable,
  styles,
  UserPicture,
} from "./styles";

type AddUserPhotoProps = {
  picture: Picture;
  onDelete: () => void;
  onAdd: ({ url }: { url: string }) => void;
  /**
   * Position of this slot inside the photo grid. Used to derive a stable
   * `testID` (`add-photo-{index}` / `remove-photo-{index}`) so Maestro flows
   * can target a specific cell without depending on screen coordinates.
   */
  index?: number;
};

const photoActionTestID = (index: number, hasPicture: boolean) =>
  hasPicture ? `remove-photo-${index}` : `add-photo-button-${index}`;

const hitSlop = {
  top: 150,
  bottom: 150,
  left: 100,
  right: 100,
};

export const AddUserPhoto: React.FC<AddUserPhotoProps> = ({
  picture,
  onDelete,
  onAdd,
  index,
}) => {
  const [localPicture, setLocalPicture] = useState(picture.url);
  const { t } = useTranslation();

  const { theme } = useUnistyles();

  const hasPicture = Boolean(localPicture || picture.url);
  const rotation = useSharedValue(hasPicture ? 45 : 0);

  useEffect(() => {
    rotation.value = withSpring(hasPicture ? 45 : 0);
  }, [hasPicture, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const handleDelete = () => {
    setLocalPicture("");
    onDelete();
  };

  /**
   * Reports a failed upload to PostHog with the precise pipeline stage and
   * surfaces a toast to the user. Shared by both the real picker flow and
   * the Maestro placeholder skip flow so a regression in either path
   * produces identical telemetry.
   */
  const reportUploadFailure = (
    err: unknown,
    stage: "pick" | ProfileImageUploadStage,
    context: string,
  ) => {
    const reason = err instanceof Error ? err.message : String(err);

    const trackedError =
      err instanceof Error
        ? Object.assign(err, { context, stage })
        : new Error(`${context}[${stage}]: ${reason}`);
    sendError(trackedError);

    if (__DEV__) {
      magicToast.alert(
        t("imagePicker.uploadFailedDev", { reason: `[${stage}] ${reason}` }),
      );
    } else {
      magicToast.alert(t("imagePicker.uploadFailed"));
    }
  };

  const handleAdd = async () => {
    let stage: "pick" | ProfileImageUploadStage = "pick";
    try {
      const selectedImage = await showImagePickerOptions();

      /** Early on visual feedback */
      onAdd({ url: selectedImage.uri });
      setLocalPicture(selectedImage.uri);

      const finalUrl = await uploadProfileImage(selectedImage.uri, (s) => {
        stage = s;
      });

      onAdd({ url: finalUrl });
    } catch (error) {
      // When the user cancels the image picker, we don't want to show an error
      if (
        error instanceof Error &&
        error.message === ImagePickerError.CANCELED
      ) {
        return;
      }

      // Permissions denied — pickImage/takeImage already showed a native alert
      // explaining what to do. Don't double-toast.
      if (
        error instanceof Error &&
        error.message === ImagePickerError.NO_PERMISSION
      ) {
        handleDelete();
        return;
      }

      reportUploadFailure(error, stage, "ProfileImageUploader.handleAdd");
      handleDelete();
    }
  };

  /**
   * MAESTRO E2E ONLY — bypass the iOS photo picker by uploading a
   * bundled placeholder PNG through the *real* presign + compress + upload
   * pipeline. This exists because iOS 26's PHPicker grid renders inside a
   * separate `RemotePlaceholder` PHX process that XCUITest cannot synthesize
   * taps into from a Maestro `point` (issue #44).
   *
   * GATED by `shouldOfferMaestroPlaceholder()` — both `config.ENV !==
   * "production"` *and* `EXPO_PUBLIC_MAESTRO_E2E === "1"` must hold,
   * mirroring the gating pattern of the BE-mocked purchase shipped in
   * PR #35 (services/payments → `isMaestroMockMode`, paired with the API's
   * `NODE_ENV !== "production"` AND `MAESTRO_E2E=1` check). The button
   * itself is conditionally rendered on the same gate, so the
   * placeholder asset's `require(...)` is never executed in production.
   */
  const handleMaestroPlaceholderUpload = async () => {
    let stage: "pick" | ProfileImageUploadStage = "pick";
    try {
      const placeholderUri = await getMaestroPlaceholderUri();

      // Optimistic feedback identical to the real flow so screenshots/check
      // observers see the same intermediate state.
      onAdd({ url: placeholderUri });
      setLocalPicture(placeholderUri);

      const finalUrl = await uploadProfileImage(placeholderUri, (s) => {
        stage = s;
      });

      onAdd({ url: finalUrl });
    } catch (error) {
      reportUploadFailure(
        error,
        stage,
        "ProfileImageUploader.handleMaestroPlaceholderUpload",
      );
      handleDelete();
    }
  };

  const isLoading = Boolean(localPicture && !picture.url.includes("http"));

  styles.useVariants({ inverted: hasPicture });

  // `shouldOfferMaestroPlaceholder()` short-circuits on
  // `config.ENV === "production"` so App Store builds always evaluate to
  // `false` here regardless of EXPO_PUBLIC_MAESTRO_E2E misconfiguration.
  const showMaestroSkip =
    !hasPicture && !isLoading && shouldOfferMaestroPlaceholder();

  // `add-photo-button-{index}` (the `+` pill below) is the ONLY node in this
  // cell that iOS exposes to the accessibility tree —
  // react-native-draggable-grid wraps each cell in a pan-responder view that
  // hides the whole inner subtree, so neither `add-photo-{index}` nor
  // `maestro-skip-photo-{index}` ever surfaces (verified with
  // `maestro hierarchy` on iPhone 17 Pro Max / iOS 26). That left Maestro
  // with a coordinate tap as the only way to reach the placeholder, which
  // silently stops attaching a photo the moment the grid shifts by a few
  // points — and CreateProfile refuses to submit without one, so
  // CompleteProfile and AskForLocation become unreachable.
  //
  // Under the same double gate as the pill (`shouldOfferMaestroPlaceholder`:
  // config.ENV !== "production" AND EXPO_PUBLIC_MAESTRO_E2E === "1"), the
  // `+` therefore triggers the placeholder upload instead of the system
  // picker. Production builds are untouched: `showMaestroSkip` is always
  // false there, so this is exactly `handleAdd`.
  const handleEmptySlotPress = showMaestroSkip
    ? handleMaestroPlaceholderUpload
    : handleAdd;

  // 1-based: "Add photo 1" is the first slot. `index` is optional, and a grid
  // without one has a single unnumbered cell.
  const photoLabel = (key: "addPhoto" | "removePhoto") =>
    t(`profilePhotos.${key}`, {
      replace: { position: typeof index === "number" ? index + 1 : "" },
    }).trim();

  return (
    <View style={styles.userPictureContainer}>
      <View style={styles.userPictureContent}>
        <UserPicture
          style={styles.userPicture}
          key={localPicture}
          {...(localPicture
            ? { source: { uri: localPicture, blurhash: picture.blurhash } }
            : undefined)}
        />
        {isLoading ? (
          <Animated.View
            style={styles.animatedOverlay}
            exiting={FadeOut.duration(150)}
          >
            <ActivityIndicator color="#FFF" />
          </Animated.View>
        ) : null}
        {!hasPicture && (
          <PressableArea
            testID={
              typeof index === "number" ? `add-photo-${index}` : undefined
            }
            // A Pressable with only an SVG inside it has nothing to announce
            // and, on iOS, nothing to be: the whole photo cell was a blank
            // region to VoiceOver. It is also why maestro's XCUITest driver
            // could not see this node or the skip pill and every flow had to
            // reach the grid through `add-photo-button-N`
            // (.unistyles-migration/baseline-report.md, "What changed to get
            // here").
            accessible
            accessibilityRole="button"
            accessibilityLabel={photoLabel("addPhoto")}
            onPress={handleAdd}
            // Takes up the whole component. When the Maestro skip pill is
            // shown, retract the bottom slop so it can't swallow taps meant
            // for the pill (150pt of slop otherwise covers the entire cell
            // including the pill's strip).
            hitSlop={showMaestroSkip ? { ...hitSlop, bottom: 0 } : hitSlop}
          >
            <FadedDog
              style={styles.fadedDog}
              fill={theme.colors.text}
              width={40}
              height={40}
            />
          </PressableArea>
        )}
        {
          /** Picture status is only returned in development mode for debugging */
          picture.status ? (
            <View style={styles.debugImageStatusContainer}>
              <Text color="white" fontSize="xxs" fontWeight="medium">
                {picture.status}
              </Text>
            </View>
          ) : null
        }
        {/*
          MAESTRO_E2E placeholder skip affordance — see comment on
          `handleMaestroPlaceholderUpload`. Rendered only when both gates pass
          and the slot is empty + idle. Anchored to the bottom edge of the
          cell so a Maestro `point` tap at e.g. (cell_x, cell_y + ~85%) lands
          cleanly without overlapping the centered FadedDog hit area.
          testID is per-slot so flow 20 can disambiguate which cell to fill.
        */}
        {showMaestroSkip ? (
          <MaestroSkipPressable
            style={styles.maestroSkipPressable}
            testID={
              typeof index === "number"
                ? `maestro-skip-photo-${index}`
                : "maestro-skip-photo"
            }
            // Not translated: this affordance only exists in the E2E build.
            // It is `accessible` for the same reason as the rest — that is
            // what puts a node in the iOS accessibility tree, which is the
            // tree maestro's iOS driver reads.
            accessible
            accessibilityRole="button"
            accessibilityLabel="Skip photo"
            onPress={handleMaestroPlaceholderUpload}
          >
            {/*
              One line, always. "MAESTRO_E2E_SKIP_PHOTO" is 22 characters in a
              cell a third of the screen wide: it wrapped mid-word and the cell
              clipped the second line off. The testID, which is what Android
              flows actually select on, is unchanged.
            */}
            <Text
              color="white"
              fontSize="xxs"
              fontWeight="bold"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              SKIP PHOTO
            </Text>
          </MaestroSkipPressable>
        ) : null}
      </View>
      <AddRemoveContainer
        style={styles.addRemoveContainer}
        testID={
          typeof index === "number"
            ? photoActionTestID(index, hasPicture)
            : undefined
        }
        // The same glyph does both jobs and rotates between them, so the
        // label has to say which one it is doing right now.
        accessible
        accessibilityRole="button"
        accessibilityLabel={photoLabel(hasPicture ? "removePhoto" : "addPhoto")}
        disabled={isLoading}
        onPress={hasPicture ? handleDelete : handleEmptySlotPress}
      >
        <Animated.View style={style}>
          <AddRemove fill={hasPicture ? theme.colors.primary : "white"} />
        </Animated.View>
      </AddRemoveContainer>
    </View>
  );
};
