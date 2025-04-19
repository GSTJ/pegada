import { useState } from "react";
import * as React from "react";
import { ActivityIndicator, Alert } from "react-native";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";
import { FileSystemUploadType, uploadAsync } from "expo-file-system";
import { useTheme } from "styled-components/native";

import AddRemove from "@/assets/images/AddRemove.svg";
import { PressableArea } from "@/components/PressableArea";
import {
  compressImage,
  ImagePickerError,
  Picture,
  showImagePickerOptions
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
};

const hitSlop = {
  top: 150,
  bottom: 150,
  left: 100,
  right: 100
};

export const AddUserPhoto: React.FC<AddUserPhotoProps> = ({
  picture,
  onDelete,
  onAdd
}) => {
  const [localPicture, setLocalPicture] = useState(picture.url);

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
    try {
      const selectedImage = await showImagePickerOptions();

      /** Early on visual feedback */
      onAdd({ url: selectedImage.uri });
      setLocalPicture(selectedImage.uri);

      const presignedUrl = await getTrcpContext().image.signedUrl.fetch();

      /**
       * Compress the image before uploading. Expensive operation,
       * so we do it only after the visual feedback is shown.
       */
      const compressedImage = await compressImage(selectedImage.uri);

      const response = await uploadAsync(presignedUrl, compressedImage.uri, {
        mimeType: getMimeType(compressedImage.uri),
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        httpMethod: "PUT"
      });

      if (response.status !== 200) {
        throw new Error("Failed to upload image");
      }

      const finalUrl = presignedUrl.split("?")[0] as string;

      onAdd({ url: finalUrl });
    } catch (err) {
      // When the user cancels the image picker, we don't want to show an error
      if (err instanceof Error && err.message === ImagePickerError.CANCELED) {
        return;
      }

      sendError(err);

      Alert.alert("Erro ao adicionar imagem");
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
