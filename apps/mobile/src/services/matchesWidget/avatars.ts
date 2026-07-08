import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";

import { WIDGET_APP_GROUP } from "../../../modules/pegada-widget";

const AVATARS_DIRECTORY_NAME = "widget-avatars";

export type WidgetAvatarSource = {
  dogId: string;
  url: string | undefined;
};

/**
 * Platform-split storage backend for the widget avatars.
 *
 * iOS renders widgets in a separate process, so images must live in the
 * shared App Group container. Android's Glance widget runs inside the app
 * process, so the app's private document directory is enough.
 */
const getBaseDirectory = (): Directory | null => {
  if (Platform.OS === "ios") {
    return Paths.appleSharedContainers[WIDGET_APP_GROUP] ?? null;
  }

  if (Platform.OS === "android") {
    return Paths.document;
  }

  return null;
};

const getAvatarsDirectory = (): Directory | null => {
  const base = getBaseDirectory();
  if (!base) return null;

  return new Directory(base, AVATARS_DIRECTORY_NAME);
};

// Native file APIs (UIImage/BitmapFactory) expect plain paths, not file:// URIs.
const toNativePath = (file: File) => decodeURI(file.uri).replace(/^file:\/\//, "");

// Tiny stable hash (djb2) so a dog changing its main photo produces a new
// cache filename, and the stale one gets swept below.
const hash = (value: string) => {
  let result = 5381;
  for (let index = 0; index < value.length; index++) {
    result = (result * 33) ^ value.charCodeAt(index);
  }
  return (result >>> 0).toString(36);
};

/**
 * Downloads (at most 3, enforced by the caller) avatars into the widget
 * storage, reusing files already on disk, and sweeps files that no longer
 * belong to any of the current dogs.
 *
 * Returns a map of dogId -> absolute file path for the snapshot. A failed
 * download simply leaves that dog without an avatar; the widget falls back
 * to an initial-letter circle.
 */
export const downloadWidgetAvatars = async (
  sources: WidgetAvatarSource[],
): Promise<Map<string, string>> => {
  const avatarPathByDogId = new Map<string, string>();

  const directory = getAvatarsDirectory();
  if (!directory) return avatarPathByDogId;

  directory.create({ intermediates: true, idempotent: true });

  const filesToKeep = new Set<string>();

  await Promise.all(
    sources.map(async ({ dogId, url }) => {
      if (!url) return;

      const file = new File(directory, `${dogId}-${hash(url)}.img`);
      filesToKeep.add(file.name);

      try {
        if (!file.exists) {
          await File.downloadFileAsync(url, file);
        }

        avatarPathByDogId.set(dogId, toNativePath(file));
      } catch {
        // Offline or a broken image URL: the widget still renders, just
        // without this avatar.
      }
    }),
  );

  try {
    for (const entry of directory.list()) {
      if (entry instanceof File && !filesToKeep.has(entry.name)) {
        entry.delete();
      }
    }
  } catch {
    // Sweeping is best-effort; leftover files get retried next sync.
  }

  return avatarPathByDogId;
};

export const clearWidgetAvatars = () => {
  const directory = getAvatarsDirectory();

  if (directory?.exists) {
    directory.delete();
  }
};
