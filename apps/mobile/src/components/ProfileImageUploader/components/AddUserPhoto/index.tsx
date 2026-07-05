import { useState } from "react";
import * as React from "react";
import { ActivityIndicator } from "react-native";
import { magicToast } from "react-native-magic-toast";
import Animated, { FadeOut, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import AddRemove from "@/assets/images/AddRemove.svg";
import { PressableArea } from "@/components/PressableArea";
import {
  getMaestroPlaceholderUri,
  ImagePickerError,
  Picture,
  ProfileImageUploadStage,
  shouldOfferMaestroPlaceholder,
  showImagePickerOptions,
  uploadProfileImage,
} from "@/components/ProfileImageUploader/utils";
import { Text } from "@/components/Text";
import { sendError } from "@/services/errorTracking";
import * as S from "./styles";

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

const hitSlop = {
  top: 150,
  bottom: 150,
  left: 100,
  right: 100,
};

export const AddUserPhoto: React.FC<AddUserPhotoProps> = ({ picture, onDelete, onAdd, index }) => {
  const [localPicture, setLocalPicture] = useState(picture.url);
  const { t } = useTranslation();

  const theme = useTheme();

  const hasPicture = Boolean(localPicture || picture.url);

  const style = useAnimatedStyle(() => {
    "worklet";
    const rotation = withSpring(hasPicture ? `45deg` : `0deg`);
    return { transform: [{ rotateZ: rotation }] };
  });

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
      magicToast.alert(t("imagePicker.uploadFailedDev", { reason: `[${stage}] ${reason}` }));
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
    } catch (err) {
      // When the user cancels the image picker, we don't want to show an error
      if (err instanceof Error && err.message === ImagePickerError.CANCELED) {
        return;
      }

      // Permissions denied — pickImage/takeImage already showed a native alert
      // explaining what to do. Don't double-toast.
      if (err instanceof Error && err.message === ImagePickerError.NO_PERMISSION) {
        handleDelete();
        return;
      }

      reportUploadFailure(err, stage, "ProfileImageUploader.handleAdd");
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
    } catch (err) {
      reportUploadFailure(err, stage, "ProfileImageUploader.handleMaestroPlaceholderUpload");
      handleDelete();
    }
  };

  const isLoading = Boolean(localPicture && !picture.url.includes("http"));

  // `shouldOfferMaestroPlaceholder()` short-circuits on
  // `config.ENV === "production"` so App Store builds always evaluate to
  // `false` here regardless of EXPO_PUBLIC_MAESTRO_E2E misconfiguration.
  const showMaestroSkip = !hasPicture && !isLoading && shouldOfferMaestroPlaceholder();

  return (
    <S.UserPictureContainer>
      <S.UserPictureContent>
        <S.UserPicture
          key={localPicture}
          {...(localPicture
            ? { source: { uri: localPicture, blurhash: picture.blurhash } }
            : undefined)}
        />
        {isLoading ? (
          <S.AnimatedOverlay exiting={FadeOut.duration(150)}>
            <ActivityIndicator color="#FFF" />
          </S.AnimatedOverlay>
        ) : null}
        {!hasPicture && (
          <PressableArea
            testID={typeof index === "number" ? `add-photo-${index}` : undefined}
            onPress={handleAdd}
            // Takes up the whole component. When the Maestro skip pill is
            // shown, retract the bottom slop so it can't swallow taps meant
            // for the pill (150pt of slop otherwise covers the entire cell
            // including the pill's strip).
            hitSlop={showMaestroSkip ? { ...hitSlop, bottom: 0 } : hitSlop}
          >
            <S.FadedDog fill={theme.colors.text} width={40} height={40} />
          </PressableArea>
        )}
        {
          /** Picture status is only returned in development mode for debugging */
          picture.status ? (
            <S.DebugImageStatusContainer>
              <Text color="white" fontSize="xxs" fontWeight="medium">
                {picture.status}
              </Text>
            </S.DebugImageStatusContainer>
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
          <S.MaestroSkipPressable
            testID={
              typeof index === "number" ? `maestro-skip-photo-${index}` : "maestro-skip-photo"
            }
            onPress={handleMaestroPlaceholderUpload}
          >
            <Text color="white" fontSize="xxs" fontWeight="bold">
              MAESTRO_E2E_SKIP_PHOTO
            </Text>
          </S.MaestroSkipPressable>
        ) : null}
      </S.UserPictureContent>
      <S.AddRemoveContainer
        testID={
          typeof index === "number"
            ? hasPicture
              ? `remove-photo-${index}`
              : `add-photo-button-${index}`
            : undefined
        }
        disabled={isLoading}
        inverted={hasPicture}
        onPress={hasPicture ? handleDelete : handleAdd}
      >
        <Animated.View style={style}>
          <AddRemove fill={hasPicture ? theme.colors.primary : "white"} />
        </Animated.View>
      </S.AddRemoveContainer>
    </S.UserPictureContainer>
  );
};
