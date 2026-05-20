import { useState } from "react";
import * as React from "react";
import { ActivityIndicator } from "react-native";
import { magicToast } from "react-native-magic-toast";
import Animated, { FadeOut, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import AddRemove from "@/assets/images/AddRemove.svg";
import { PressableArea } from "@/components/PressableArea";
import {
  compressImage,
  ImagePickerError,
  Picture,
  showImagePickerOptions,
} from "@/components/ProfileImageUploader/utils";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { getMimeType } from "@/services/getMimeType";
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

  const handleAdd = async () => {
    let stage: "pick" | "presign" | "compress" | "upload" | "finalize" = "pick";
    try {
      const selectedImage = await showImagePickerOptions();

      /** Early on visual feedback */
      onAdd({ url: selectedImage.uri });
      setLocalPicture(selectedImage.uri);

      stage = "presign";
      const presignedUrl = await getTrcpContext().image.signedUrl.fetch();

      /**
       * Compress the image before uploading. Expensive operation,
       * so we do it only after the visual feedback is shown.
       */
      stage = "compress";
      const compressedImage = await compressImage(selectedImage.uri);

      stage = "upload";
      const response = await uploadAsync(presignedUrl, compressedImage.uri, {
        mimeType: getMimeType(compressedImage.uri),
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        httpMethod: "PUT",
      });

      if (response.status !== 200) {
        throw new Error(`S3 PUT returned ${response.status}`);
      }

      stage = "finalize";
      const finalUrl = presignedUrl.split("?")[0] as string;

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

      const reason = err instanceof Error ? err.message : String(err);

      const trackedError =
        err instanceof Error
          ? Object.assign(err, { context: "ProfileImageUploader.handleAdd", stage })
          : new Error(`ProfileImageUploader.handleAdd[${stage}]: ${reason}`);
      sendError(trackedError);

      // Surface a real error to the user (was a silent Portuguese-only Alert).
      // In dev mode include the underlying reason so devs/QA can debug.
      if (__DEV__) {
        magicToast.alert(t("imagePicker.uploadFailedDev", { reason: `[${stage}] ${reason}` }));
      } else {
        magicToast.alert(t("imagePicker.uploadFailed"));
      }
      handleDelete();
    }
  };

  const isLoading = Boolean(localPicture && !picture.url.includes("http"));

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
            // Takes up the whole component,
            hitSlop={hitSlop}
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
