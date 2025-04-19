import AsyncStorage from "@react-native-async-storage/async-storage";

export enum StorageKeys {
  Token = "token",
  Theme = "theme",
  Language = "language",
  AppReviewRequestDate = "appReviewRequestDate",
  AppReviewStatus = "appReviewStatus"
}

export enum Theme {
  Light = "light",
  Dark = "dark",
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  Default = "light"
}

export interface StorageDataTypes {
  [StorageKeys.Token]: string;
  [StorageKeys.Theme]: Theme;
  [StorageKeys.Language]: string;
  [StorageKeys.AppReviewRequestDate]: string;
  [StorageKeys.AppReviewStatus]: "completed";
}

export const storeData = async <T extends StorageKeys>(
  key: T,
  value: StorageDataTypes[T]
) => {
  await AsyncStorage.setItem(key, value);
  return value;
};

export const getData = async <T extends StorageKeys>(key: T) => {
  const value = await AsyncStorage.getItem(key);
  return value as StorageDataTypes[T] | null;
};

export const deleteData = async (key: StorageKeys) => {
  await AsyncStorage.removeItem(key);
};
