import * as SecureStore from "expo-secure-store";

/* oxlint-disable typescript/no-duplicate-enum-values -- `Default` aliases another enum member by design */
import AsyncStorage from "@react-native-async-storage/async-storage";

export enum StorageKeys {
  Token = "token",
  Theme = "theme",
  Language = "language",
  AppReviewRequestDate = "appReviewRequestDate",
  AppReviewStatus = "appReviewStatus",
  NewDogsAlertRequested = "newDogsAlertRequested",
  AppReviewMatchPrompted = "appReviewMatchPrompted",
  AppReviewSentMessageCount = "appReviewSentMessageCount",
  /** JSON, written by `services/referral`. Survives the install, not the login. */
  PendingReferral = "pendingReferral",
}

export enum Theme {
  Light = "light",
  Dark = "dark",
  Default = "light",
}

export type StorageDataTypes = {
  [StorageKeys.Token]: string;
  [StorageKeys.Theme]: Theme;
  [StorageKeys.Language]: string;
  [StorageKeys.AppReviewRequestDate]: string;
  [StorageKeys.AppReviewStatus]: "completed";
  [StorageKeys.NewDogsAlertRequested]: "requested";
  [StorageKeys.AppReviewMatchPrompted]: "true";
  [StorageKeys.AppReviewSentMessageCount]: string;
  [StorageKeys.PendingReferral]: string;
};

export const storeData = async <T extends StorageKeys>(
  key: T,
  value: StorageDataTypes[T],
) => {
  if (key === StorageKeys.Token) {
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
    return value;
  }

  await AsyncStorage.setItem(key, value);
  return value;
};

export const getData = async <T extends StorageKeys>(key: T) => {
  if (key === StorageKeys.Token) {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue) return secureValue as StorageDataTypes[T];

    const legacyValue = await AsyncStorage.getItem(key);
    if (!legacyValue) return null;

    await SecureStore.setItemAsync(key, legacyValue);
    await AsyncStorage.removeItem(key);
    return legacyValue as StorageDataTypes[T];
  }

  const value = await AsyncStorage.getItem(key);
  return value as StorageDataTypes[T] | null;
};

export const deleteData = async (key: StorageKeys) => {
  if (key === StorageKeys.Token) {
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
    return;
  }

  await AsyncStorage.removeItem(key);
};
