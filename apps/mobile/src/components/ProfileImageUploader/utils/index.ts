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

import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import i18n from "@/i18n";
import { config } from "@/services/config";
import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { getMimeType } from "@/services/getMimeType";

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

/**
 * Stage identifiers for the profile-image upload pipeline. Kept as a union so
 * the catch site in `AddUserPhoto` can attach the failing stage to the error
 * payload sent to PostHog without stringly-typed magic values.
 */
export type ProfileImageUploadStage = "presign" | "compress" | "upload" | "finalize";

export class ProfileImageUploadError extends Error {
  readonly stage: ProfileImageUploadStage;
  constructor(stage: ProfileImageUploadStage, message: string, options?: { cause?: unknown }) {
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
 *   1. presign — request a one-shot S3 PUT URL from the API
 *   2. compress — re-encode to WEBP @ 0.8 quality (expensive, kept after the
 *      caller has already shown optimistic visual feedback)
 *   3. upload — PUT the bytes to S3 via expo-file-system's BINARY_CONTENT mode
 *   4. finalize — strip the query string off the presigned URL to get the
 *      canonical public URL of the uploaded object
 *
 * `onProgress` is called as each stage *starts* so the caller can keep a stage
 * label for telemetry; the final `finalize` notification fires immediately
 * before the canonical URL is returned.
 */
export const uploadProfileImage = async (
  localUri: string,
  onProgress?: (stage: ProfileImageUploadStage) => void,
): Promise<string> => {
  onProgress?.("presign");
  const presignedUrl = await getTrcpContext()
    .image.signedUrl.fetch()
    .catch((cause) => {
      throw new ProfileImageUploadError("presign", "Failed to fetch presigned S3 URL", { cause });
    });

  onProgress?.("compress");
  const compressedImage = await compressImage(localUri).catch((cause) => {
    throw new ProfileImageUploadError("compress", "compressImage failed", { cause });
  });

  onProgress?.("upload");
  const response = await uploadAsync(presignedUrl, compressedImage.uri, {
    mimeType: getMimeType(compressedImage.uri),
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    httpMethod: "PUT",
  }).catch((cause) => {
    throw new ProfileImageUploadError("upload", "uploadAsync threw", { cause });
  });

  if (response.status !== 200) {
    throw new ProfileImageUploadError("upload", `S3 PUT returned ${response.status}`);
  }

  onProgress?.("finalize");
  return presignedUrl.split("?")[0] as string;
};

/**
 * Whether the `MAESTRO_E2E_SKIP_PHOTO` affordance should render. The
 * affordance is GATED on TWO independent env signals so production builds
 * can never expose it even if one gate is misconfigured:
 *
 *   1. `config.ENV !== "production"` — production releases always set
 *      `EXPO_PUBLIC_ENV=production` (the Zod schema accepts only
 *      `"development"` | `"production"`), so a real App Store build
 *      always fails this check regardless of other env state.
 *   2. `config.MAESTRO_E2E === "1"` — only set in the Maestro CI build
 *      (`.github/workflows/e2e-mobile.yml`) and when developers explicitly
 *      run `EXPO_PUBLIC_MAESTRO_E2E=1 expo run:ios`.
 *
 * Mirrors the BE-mocked purchase gating from PR #35
 * (`services/payments` → `isMaestroMockMode`, paired with `MAESTRO_E2E=1`
 * AND `NODE_ENV !== "production"` on the API side), so the whole
 * Maestro-only escape hatch surface uses one consistent pattern.
 *
 * `__DEV__` is intentionally NOT used: the verify step needs to exercise
 * the affordance in a `--configuration Release` simulator build (which
 * sets `__DEV__ === false`), and the iOS 26 picker issue we are working
 * around only reproduces in Release builds anyway. The two env-based
 * gates above already provide defense-in-depth without coupling to the
 * compile-time DEV flag.
 *
 * Metro may still include the placeholder PNG (~218 bytes) in Release
 * bundles because `require(...)` inside a function body is not statically
 * eliminable — accepted tradeoff for the runtime safety.
 */
export const shouldOfferMaestroPlaceholder = (): boolean => {
  return config.ENV !== "production" && config.MAESTRO_E2E === "1";
};

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
  const asset = Asset.fromModule(require("@/assets/images/maestro-placeholder.png"));
  await asset.downloadAsync();

  const localUri = asset.localUri ?? asset.uri;
  if (!localUri) {
    throw new Error("Maestro placeholder asset has no localUri/uri after downloadAsync");
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
