/**
 * The image MIME types this app can ever need to name, keyed by lowercase
 * extension.
 *
 * This replaces `react-native-mime-types`, which pulls in `mime-db`'s full
 * IANA registry — a single 181.7 KB JSON module, 1.2 % of the mobile bundle —
 * to answer a question with exactly one caller: what to put in the
 * `Content-Type` of a profile-photo upload.
 *
 * The set is deliberately wider than that caller needs. In practice the only
 * value it ever produces today is `image/webp`, because the upload path runs
 * every picked photo through `expo-image-manipulator` with
 * `format: SaveFormat.WEBP` first. The rest are the formats
 * `expo-image-picker` can hand back on iOS and Android, so a future caller
 * that skips the compression step still resolves.
 *
 * Every value here is the one `mime-db` returns for the same extension —
 * `image-mime-types.test.ts` pins them.
 */
export const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

/**
 * Resolve a MIME type from a file name, path or URI.
 *
 * Behaviour is matched to `mime.lookup` from `react-native-mime-types` for
 * every extension in `IMAGE_MIME_TYPES`, including its quirks: the extension
 * is everything after the *last* dot (so `.jpg` on its own resolves, and
 * `photo.webp?v=1` does not), the match is case-insensitive, and anything
 * unrecognised returns `false` rather than throwing.
 */
export const lookupImageMimeType = (fileName: string): string | false => {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return false;

  const extension = fileName.slice(dot + 1).toLowerCase();
  return IMAGE_MIME_TYPES[extension] ?? false;
};
