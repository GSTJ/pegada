import { Alert, Platform } from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";

export interface Picture {
  id: string;
  key: string;
  disabledDrag: boolean;
  disabledReSorted: boolean;
  url: string;
  position: number;
  status?: keyof typeof IMAGE_STATUS;
  blurhash?: string;
}

export type DeletedPicture = Omit<Picture, "position">;

export const pictures: Picture[] = Array(6)
  .fill(null)
  .map(
    (_data, index): Picture => ({
      id: `image-id-${index}`,
      key: `image-key-${index}`,
      url: "",
      disabledDrag: true,
      disabledReSorted: true,
      position: index
    })
  );

export const sortByUrl = (
  firstItem: Picture | DeletedPicture,
  secondItem: Picture | DeletedPicture
): number => {
  return firstItem.url && !secondItem.url ? -1 : 1;
};

export const deleteItem =
  (picture: Picture) =>
  (currentPic: Picture): DeletedPicture => {
    if (currentPic.key !== picture.key) return currentPic;

    return {
      id: currentPic.id,
      key: currentPic.key,
      url: "",
      disabledDrag: true,
      disabledReSorted: true
    };
  };

export const compressImage = async (uri: string) => {
  const manipResult = await manipulateAsync(uri, [], {
    format: SaveFormat.WEBP,
    compress: 0.8
  });

  return manipResult;
};

const formatImage = (image: ImagePicker.ImagePickerAsset) => {
  const pictureUri =
    Platform.OS === "ios" ? image.uri.replace("file://", "") : image.uri;

  return { uri: pictureUri, name: image.fileName, type: image.type };
};

export enum ImagePickerError {
  CANCELED = "User canceled",
  NO_PERMISSION = "User did not grant permission",
  NO_IMAGE = "No image selected"
}

export const pickImage = async () => {
  const cameraRollStatus =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (cameraRollStatus.status !== "granted") {
    Alert.alert(
      i18n.t("imagePicker.permissionsRequiredTitle"),
      i18n.t("imagePicker.permissionsRequiredMessage")
    );
    throw new Error(ImagePickerError.NO_PERMISSION);
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [9, 16],
    quality: 1
  });

  if (result.canceled) {
    throw new Error(ImagePickerError.CANCELED);
  }

  const image = result.assets[0];

  if (!image) {
    throw new Error(ImagePickerError.NO_IMAGE);
  }

  return formatImage(image);
};

export const takeImage = async () => {
  const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

  if (cameraStatus.status !== "granted") {
    Alert.alert(
      i18n.t("imagePicker.permissionsRequiredTitle"),
      i18n.t("imagePicker.permissionsRequiredMessage")
    );
    throw new Error(ImagePickerError.NO_PERMISSION);
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [9, 16],
    quality: 1
  });

  if (result.canceled) {
    throw new Error(ImagePickerError.CANCELED);
  }

  const image = result.assets[0];

  if (!image) {
    throw new Error(ImagePickerError.NO_IMAGE);
  }

  return formatImage(image);
};

export const showImagePickerOptions = (): Promise<{
  uri: string;
  name?: string | null;
  type?: string | null;
}> => {
  return new Promise((resolve, reject) => {
    Alert.alert(
      i18n.t("imagePicker.title"),
      i18n.t("imagePicker.message"),
      [
        {
          text: i18n.t("imagePicker.takePhoto"),
          onPress: () => {
            takeImage()
              .then((imageUrl) => resolve(imageUrl))
              .catch((error) => {
                if (
                  error instanceof Error &&
                  error.message !== ImagePickerError.CANCELED
                ) {
                  sendError(error);
                }

                reject(error);
              });
          }
        },
        {
          text: i18n.t("imagePicker.chooseFromLibrary"),
          onPress: () => {
            pickImage()
              .then((imageUrl) => resolve(imageUrl))
              .catch((error) => {
                if (
                  error instanceof Error &&
                  error.message !== ImagePickerError.CANCELED
                ) {
                  sendError(error);
                }

                reject(error);
              });
          }
        },
        {
          text: i18n.t("imagePicker.cancel"),
          onPress: () => {
            reject(new Error(ImagePickerError.CANCELED));
          },
          style: "cancel"
        }
      ],
      { cancelable: false }
    );
  });
};
