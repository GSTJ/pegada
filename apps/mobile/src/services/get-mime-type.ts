import type { ImagePickerAsset } from "expo-image-picker";

import { lookupImageMimeType } from "./image-mime-types";

const getMimeTypeFromUri = (uri: string) => {
  const fileName = uri?.slice(uri.lastIndexOf("/") + 1);
  const mimeByFileName = lookupImageMimeType(fileName);
  if (mimeByFileName) {
    return mimeByFileName;
  }

  throw new Error("File mime type is not defined");
};

const getMimeTypeFromAsset = (file: ImagePickerAsset) => {
  if (file.uri) {
    const mimeByUri = lookupImageMimeType(file.uri);
    if (mimeByUri) {
      return mimeByUri;
    }
  }

  if (file.fileName) {
    const mimeByFileName = lookupImageMimeType(file.fileName);
    if (mimeByFileName) {
      return mimeByFileName;
    }
  }

  if (file.type) {
    return file.type;
  }

  throw new Error("File mime type is not defined");
};

// Try to get mime type from file extension, fallback to the one provided by the asset
export const getMimeType = (file: ImagePickerAsset | string) => {
  if (typeof file === "string") {
    return getMimeTypeFromUri(file);
  }

  return getMimeTypeFromAsset(file);
};
