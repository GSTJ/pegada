/**
 * Issue #282, item 4: "This photo upload has expired" on Create Profile. The
 * photos go to the bucket the moment they are picked, the name and the bio are
 * typed afterwards, and the grant used to die ten minutes in. Save then failed,
 * and the dead URLs stayed in form state, so every further tap failed the same
 * way and the profile could not be saved at all.
 *
 * The server now holds the grant for an hour. This is the client half: one
 * re-upload, one more save, and a toast if even that does not land.
 */
jest.mock<Record<string, unknown>>(
  "@/components/ProfileImageUploader/utils",
  () => ({ uploadProfileImage: jest.fn() }),
);

jest.mock<Record<string, unknown>>("react-native-magic-toast", () => ({
  magicToast: { alert: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import { InvalidUploadGrantError } from "@pegada/shared/errors/errors";
import { magicToast } from "react-native-magic-toast";

import { uploadProfileImage } from "@/components/ProfileImageUploader/utils";
import { sendError } from "@/services/error-tracking";

import { saveWithExpiredUploadRetry } from "./expired-upload-retry";

const reupload = jest.mocked(uploadProfileImage);
const alert = jest.mocked(magicToast.alert);
const report = jest.mocked(sendError);

/** What the tRPC client hands the caller for a server-thrown intentional error. */
const expiredGrant = () => ({
  data: {
    error: {
      error_code: InvalidUploadGrantError.error_code,
      code: "BAD_REQUEST",
    },
  },
});

const photos = [
  { id: "first", url: "https://cdn/stale-one.webp", localUri: "file://one" },
  { id: "second", url: "https://cdn/stale-two.webp", localUri: "file://two" },
];

test("saves once and touches nothing when the photos are still good", async () => {
  const save = jest.fn(async () => "saved");

  await expect(
    saveWithExpiredUploadRetry({ images: photos, save }),
  ).resolves.toBe("saved");

  expect(save).toHaveBeenCalledTimes(1);
  expect(reupload).not.toHaveBeenCalled();
});

test("leaves any other failure alone rather than re-uploading on a hunch", async () => {
  const offline = new TypeError("Network request failed");
  const save = jest.fn(async () => {
    throw offline;
  });

  await expect(
    saveWithExpiredUploadRetry({ images: photos, save }),
  ).rejects.toBe(offline);

  expect(save).toHaveBeenCalledTimes(1);
  expect(reupload).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});

test("puts the photos back and saves again, once", async () => {
  reupload
    .mockResolvedValueOnce("https://cdn/fresh-one.webp")
    .mockResolvedValueOnce("https://cdn/fresh-two.webp");

  const save = jest
    .fn<Promise<string>, [typeof photos]>()
    .mockRejectedValueOnce(expiredGrant())
    .mockResolvedValueOnce("saved");

  const onReuploaded = jest.fn();

  await expect(
    saveWithExpiredUploadRetry({ images: photos, save, onReuploaded }),
  ).resolves.toBe("saved");

  expect(reupload).toHaveBeenCalledTimes(2);
  expect(reupload).toHaveBeenNthCalledWith(1, "file://one");
  expect(reupload).toHaveBeenNthCalledWith(2, "file://two");

  expect(save).toHaveBeenCalledTimes(2);
  // The second attempt carries the new URLs, and the form gets them too, so a
  // manual tap afterwards cannot resubmit the dead ones.
  const freshened = [
    { ...photos[0], url: "https://cdn/fresh-one.webp" },
    { ...photos[1], url: "https://cdn/fresh-two.webp" },
  ];
  expect(save).toHaveBeenNthCalledWith(2, freshened);
  expect(onReuploaded).toHaveBeenCalledWith(freshened);

  // Nothing to tell the user about: the save went through.
  expect(alert).not.toHaveBeenCalled();
  expect(report).not.toHaveBeenCalled();
});

test("keeps a photo that only exists in the bucket exactly as it is", async () => {
  const alreadySaved = [
    { id: "old", url: "https://cdn/dogs/permanent.webp" },
    { id: "new", url: "https://cdn/stale.webp", localUri: "file://new" },
  ];
  reupload.mockResolvedValueOnce("https://cdn/fresh.webp");

  const save = jest
    .fn<Promise<string>, [typeof alreadySaved]>()
    .mockRejectedValueOnce(expiredGrant())
    .mockResolvedValueOnce("saved");

  await saveWithExpiredUploadRetry({ images: alreadySaved, save });

  expect(reupload).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenNthCalledWith(2, [
    alreadySaved[0],
    { ...alreadySaved[1], url: "https://cdn/fresh.webp" },
  ]);
});

test("tells the user and stops when the second save fails too", async () => {
  reupload.mockResolvedValue("https://cdn/fresh.webp");

  const stillExpired = expiredGrant();
  const save = jest
    .fn<Promise<string>, [typeof photos]>()
    .mockRejectedValueOnce(expiredGrant())
    .mockRejectedValueOnce(stillExpired);

  await expect(
    saveWithExpiredUploadRetry({ images: photos, save }),
  ).rejects.toBe(stillExpired);

  expect(save).toHaveBeenCalledTimes(2);
  expect(reupload).toHaveBeenCalledTimes(photos.length);
  expect(alert).toHaveBeenCalledWith("editProfile.photosExpired");
  expect(report).toHaveBeenCalledWith(stillExpired);
});

test("tells the user and stops when the photos cannot go back up", async () => {
  const uploadFailed = new Error("upload PUT returned 500");
  reupload.mockRejectedValue(uploadFailed);

  const save = jest
    .fn<Promise<string>, [typeof photos]>()
    .mockRejectedValueOnce(expiredGrant());

  await expect(
    saveWithExpiredUploadRetry({ images: photos, save }),
  ).rejects.toBe(uploadFailed);

  expect(save).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenCalledWith("editProfile.photosExpired");
});
