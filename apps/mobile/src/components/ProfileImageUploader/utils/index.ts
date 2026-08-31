import type { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";

import { Alert } from "react-native";

import { Asset } from "expo-asset";
import {
  cacheDirectory,
  copyAsync,
  documentDirectory,
  FileSystemUploadType,
  getInfoAsync,
  uploadAsync,
} from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { MAX_PROFILE_IMAGES } from "@pegada/shared/schemas/dog-schema";

import { getTrcpContext } from "@/contexts/trcp-context";
import i18n from "@/i18n";
import { isMaestroE2EBuild } from "@/services/e2e";
import { sendError } from "@/services/error-tracking";
import { getMimeType } from "@/services/get-mime-type";

export type Picture = {
  id: string;
  key: string;
  disabledDrag: boolean;
  disabledReSorted: boolean;
  url: string;
  position: number;
  status?: keyof typeof IMAGE_STATUS;
  blurhash?: string;
};

export type DeletedPicture = Omit<Picture, "position">;

export const pictures: Picture[] = Array.from(
  { length: MAX_PROFILE_IMAGES },
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
      throw new Error(
        "No writable file-system directory available for image copy",
      );
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
  const cameraRollStatus =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

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

  const [image] = result.assets;

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

  const [image] = result.assets;

  if (!image) {
    throw new Error(ImagePickerError.NO_IMAGE);
  }

  return formatImage(image);
};

/**
 * Stage identifiers for the profile-image upload pipeline. Kept as a union so
 * the catch site in `AddUserPhoto` can attach the failing stage to the error
 * payload sent to PostHog without stringly-typed magic values.
 */
export type ProfileImageUploadStage =
  | "presign"
  | "compress"
  | "upload"
  | "finalize";

export class ProfileImageUploadError extends Error {
  readonly stage: ProfileImageUploadStage;
  constructor(
    stage: ProfileImageUploadStage,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ProfileImageUploadError";
    this.stage = stage;
  }
}

/**
 * Shared upload pipeline used by both the normal "pick from library" flow and
 * the Maestro placeholder skip affordance (`shouldOfferMaestroPlaceholder`).
 *
 * Steps:
 *   1. compress — re-encode to WEBP @ 0.8 quality
 *   2. presign — send the exact byte length and request an upload descriptor:
 *      method, url, headers, and the object's canonical public URL
 *   3. upload — send the bytes exactly as the descriptor says, via
 *      expo-file-system's BINARY_CONTENT mode
 *   4. finalize — return the descriptor's `publicUrl`
 *
 * The app is storage-agnostic on purpose: it performs the upload as
 * described and stores ONLY `publicUrl`. No deriving URLs from the upload
 * target, no assumptions about hosts, buckets, or query strings — the
 * backend can switch storage vendors without an app release.
 *
 * `onProgress` is called as each stage *starts* so the caller can keep a stage
 * label for telemetry; the final `finalize` notification fires immediately
 * before the canonical URL is returned.
 */
export const uploadProfileImage = async (
  localUri: string,
  onProgress?: (stage: ProfileImageUploadStage) => void,
): Promise<string> => {
  onProgress?.("compress");
  const compressedImage = await compressImage(localUri).catch((error) => {
    throw new ProfileImageUploadError("compress", "compressImage failed", {
      cause: error,
    });
  });
  const compressedImageInfo = await getInfoAsync(compressedImage.uri);
  if (
    !compressedImageInfo.exists ||
    typeof compressedImageInfo.size !== "number"
  ) {
    throw new ProfileImageUploadError(
      "compress",
      "Compressed photo size is unavailable",
    );
  }

  onProgress?.("presign");
  const upload = await getTrcpContext()
    .image.signedUpload.fetch({
      contentLength: compressedImageInfo.size,
      contentType: "image/webp",
    })
    .catch((error) => {
      throw new ProfileImageUploadError(
        "presign",
        "Failed to fetch upload descriptor",
        { cause: error },
      );
    });

  onProgress?.("upload");
  const response = await uploadAsync(upload.url, compressedImage.uri, {
    mimeType: getMimeType(compressedImage.uri),
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    httpMethod: upload.method,
    headers: upload.headers,
  }).catch((error) => {
    throw new ProfileImageUploadError("upload", "uploadAsync threw", {
      cause: error,
    });
  });

  if (response.status !== 200) {
    throw new ProfileImageUploadError(
      "upload",
      `upload PUT returned ${response.status}`,
    );
  }

  onProgress?.("finalize");
  return upload.publicUrl;
};

/**
 * Whether the `MAESTRO_E2E_SKIP_PHOTO` affordance should render.
 *
 * The two-signal gate this used to spell out inline now lives once, in
 * `services/e2e` — the interstitial suppression needs the same one, and two
 * copies of a production escape hatch is one too many.
 *
 * Metro may still include the placeholder PNG (~218 bytes) in Release
 * bundles because `require(...)` inside a function body is not statically
 * eliminable — accepted tradeoff for the runtime safety.
 */
export const shouldOfferMaestroPlaceholder = (): boolean => isMaestroE2EBuild();

/**
 * Resolves the bundled `maestro-placeholder.png` to a readable `file://`
 * URI that `expo-image-manipulator` and `expo-file-system`'s `uploadAsync`
 * can consume.
 *
 * On native, `Asset.fromModule(...).downloadAsync()` materialises the bundled
 * resource into the app's caches directory and populates `localUri` with a
 * `file://...` path that flows through the same `normaliseAssetUri` ->
 * `compressImage` -> `uploadAsync` pipeline a real picker asset would.
 *
 * Throws if the asset cannot be materialised, so the caller surfaces a real
 * error in the UI instead of silently no-op'ing the skip button.
 *
 * Runtime safety: this function is only reachable when both Maestro gates
 * pass (`shouldOfferMaestroPlaceholder()`), so production builds never
 * execute it even though the bundler may still ship the PNG.
 */
export const getMaestroPlaceholderUri = async (): Promise<string> => {
  const asset = Asset.fromModule(
    require("@/assets/images/maestro-placeholder.png"),
  );
  await asset.downloadAsync();

  const localUri = asset.localUri ?? asset.uri;
  if (!localUri) {
    throw new Error(
      "Maestro placeholder asset has no localUri/uri after downloadAsync",
    );
  }

  // Re-use the same normaliser the real picker pipeline uses so we end up with
  // a `file://` URI regardless of which form the asset registry returned.
  return normaliseAssetUri(localUri);
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
          },
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
