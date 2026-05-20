import { Alert } from "react-native";
import {
  cacheDirectory,
  copyAsync,
  documentDirectory,
  getInfoAsync,
} from "expo-file-system/legacy";
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
      position: index,
    }),
  );

export const sortByUrl = (
  firstItem: Picture | DeletedPicture,
  secondItem: Picture | DeletedPicture,
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
      disabledReSorted: true,
    };
  };

export const compressImage = async (uri: string) => {
  const manipResult = await manipulateAsync(uri, [], {
    format: SaveFormat.WEBP,
    compress: 0.8,
  });

  return manipResult;
};

/**
 * Normalises a URI returned by `expo-image-picker` into a `file://` URI that
 * `expo-file-system`'s `uploadAsync` and `expo-image-manipulator`'s
 * `manipulateAsync` can consume.
 *
 * Two real-world problems are handled here:
 *
 * 1. **iOS Photos asset URIs (`ph://...`)** — On iOS 14+ the system PHPicker
 *    can hand back a `ph://` asset identifier instead of a `file://` path
 *    (more common when the user picks straight from the library without the
 *    crop/edit step, but also seen intermittently on iOS 26 with edited
 *    photos). Neither `uploadAsync` nor `manipulateAsync` can read `ph://`
 *    URIs, so we copy the bytes into the app's cache directory and return
 *    that local `file://` path.
 *
 * 2. **Bare paths (`/var/mobile/...`)** — Older code used to strip the
 *    `file://` scheme on iOS as a workaround for a legacy RN multipart
 *    upload quirk. The modern `expo-file-system` upload API and
 *    `expo-image-manipulator` both *require* the `file://` scheme on iOS
 *    SDK 55+ (the native side passes the string to `NSURL` and a bare path
 *    silently fails to resolve), so we put it back if it's missing.
 *
 * Exported for unit testing.
 */
export const normaliseAssetUri = async (uri: string): Promise<string> => {
  // PHAsset reference — must be materialised on disk before any FS API can read it.
  if (uri.startsWith("ph://") || uri.startsWith("assets-library://")) {
    const targetDir = cacheDirectory ?? documentDirectory;
    if (!targetDir) {
      // No writable directory — extremely unlikely on a real device, but
      // surface a clear error rather than silently failing the upload.
      throw new Error("No writable file-system directory available for image copy");
    }
    const extension = (() => {
      // PH URIs sometimes carry an "?ext=jpg" hint; otherwise default to jpg.
      const extHint = uri.match(/[?&]ext=([a-zA-Z0-9]+)/)?.[1];
      return (extHint ?? "jpg").toLowerCase();
    })();
    const destination = `${targetDir}picker-${Date.now()}.${extension}`;
    await copyAsync({ from: uri, to: destination });
    return destination;
  }

  // Bare absolute path — re-add the scheme so iOS NSURL can parse it.
  if (uri.startsWith("/")) {
    return `file://${uri}`;
  }

  return uri;
};

const formatImage = async (image: ImagePicker.ImagePickerAsset) => {
  const pictureUri = await normaliseAssetUri(image.uri);

  // Defensive: fail fast with a descriptive error if the picker handed us a
  // URI we couldn't turn into a readable file. Without this, the failure
  // would surface much later from inside the native uploader with a cryptic
  // message ("Could not read file"), which is what blocked TestFlight.
  const info = await getInfoAsync(pictureUri);
  if (!info.exists) {
    throw new Error(`Image file not found at normalised URI: ${pictureUri}`);
  }

  return { uri: pictureUri, name: image.fileName, type: image.type };
};

export enum ImagePickerError {
  CANCELED = "User canceled",
  NO_PERMISSION = "User did not grant permission",
  NO_IMAGE = "No image selected",
}

export const pickImage = async () => {
  const cameraRollStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (cameraRollStatus.status !== "granted") {
    Alert.alert(
      i18n.t("imagePicker.permissionsRequiredTitle"),
      i18n.t("imagePicker.permissionsRequiredMessage"),
    );
    throw new Error(ImagePickerError.NO_PERMISSION);
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [9, 16],
    quality: 1,
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
      i18n.t("imagePicker.permissionsRequiredMessage"),
    );
    throw new Error(ImagePickerError.NO_PERMISSION);
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [9, 16],
    quality: 1,
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
                if (error instanceof Error && error.message !== ImagePickerError.CANCELED) {
                  sendError(error);
                }

                reject(error);
              });
          },
        },
        {
          text: i18n.t("imagePicker.chooseFromLibrary"),
          onPress: () => {
            pickImage()
              .then((imageUrl) => resolve(imageUrl))
              .catch((error) => {
                if (error instanceof Error && error.message !== ImagePickerError.CANCELED) {
                  sendError(error);
                }

                reject(error);
              });
          },
        },
        {
          text: i18n.t("imagePicker.cancel"),
          onPress: () => {
            reject(new Error(ImagePickerError.CANCELED));
          },
          style: "cancel",
        },
      ],
      { cancelable: false },
    );
  });
};
