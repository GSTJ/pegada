import mime from "react-native-mime-types";
import { ImagePickerAsset } from "expo-image-picker";

const getMimeTypeFromUri = (uri: string) => {
  const fileName = uri?.substring(uri.lastIndexOf("/") + 1, uri.length);
  const mimeByFileName = mime.lookup(fileName);
  if (mimeByFileName) {
    return mimeByFileName;
  }

  throw new Error("File mime type is not defined");
};

const getMimeTypeFromAsset = (file: ImagePickerAsset) => {
  if (file.uri) {
    const mimeByUri = mime.lookup(file.uri);
    if (mimeByUri) {
      return mimeByUri;
    }
  }

  if (file.fileName) {
    const mimeByFileName = mime.lookup(file.fileName);
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
