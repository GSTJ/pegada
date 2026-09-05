import { InvalidUploadGrantError } from "@pegada/shared/errors/errors";
import { magicToast } from "react-native-magic-toast";

import { uploadProfileImage } from "@/components/ProfileImageUploader/utils";
import i18n from "@/i18n";
import { sendError } from "@/services/error-tracking";
import { getError } from "@/services/get-error";

export type RetryableImage = {
  url: string;
  /** Present only while the photo is still on the phone. */
  localUri?: string;
};

/**
 * Save a dog profile, and if the server says the photos went stale, put them
 * back in the bucket and save one more time.
 *
 * Issue #282: Create Profile uploads the photos as soon as they are picked,
 * then waits for a name, a bio and a gender. The upload grant used to last ten
 * minutes, so a form filled in slowly failed on save with
 * `INVALID_UPLOAD_GRANT`, and because the dead URLs stayed in form state every
 * further tap failed the same way. The grant now lasts an hour, which is the
 * real fix; this is the floor under it, for the person who leaves the screen
 * open over lunch or whose phone slept through the whole form.
 *
 * Exactly one extra attempt. A loop here would mean re-uploading every photo
 * on a phone that is failing for some other reason, on someone else's data
 * plan, forever.
 */
export const saveWithExpiredUploadRetry = async <
  TImage extends RetryableImage,
  TResult,
>({
  images,
  save,
  onReuploaded,
}: {
  images: TImage[];
  save: (images: TImage[]) => Promise<TResult>;
  /**
   * Hand the fresh URLs back to the form. Without this a manual tap after a
   * failed retry would submit the dead ones all over again.
   */
  onReuploaded?: (images: TImage[]) => void;
}): Promise<TResult> => {
  try {
    return await save(images);
  } catch (error) {
    if (!getError(error, InvalidUploadGrantError)) throw error;

    try {
      const reuploaded = await Promise.all(
        images.map(async (image) =>
          image.localUri
            ? { ...image, url: await uploadProfileImage(image.localUri) }
            : image,
        ),
      );

      onReuploaded?.(reuploaded);

      return await save(reuploaded);
    } catch (retryError) {
      // Only now is it worth anyone's attention: the first failure is one the
      // app recovers from by itself, and reporting it would keep the exception
      // rows in the issue #188 audit alive for a problem that fixed itself.
      magicToast.alert(i18n.t("editProfile.photosExpired"));
      sendError(retryError);
      throw retryError;
    }
  }
};
