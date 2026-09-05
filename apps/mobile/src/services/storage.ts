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

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * How many times the keychain is asked for the token before the read is given
 * up on.
 *
 * iOS answers a keychain read with "a required entitlement isn't present" when
 * the app process is not attached yet, which is what a launch the user did not
 * start looks like: the system prewarming the app, or a notification waking it
 * while the phone is still locked. The entitlement is on the build, the check
 * is just not ready to see it, and it becomes ready a moment later. Three
 * looks, because the launch is waiting on this answer and a fourth would cost
 * more than it recovers.
 */
const KEYCHAIN_READ_ATTEMPTS = 3;

/** Grows per attempt, so the last look happens well after the first. */
const KEYCHAIN_RETRY_DELAY_MS = 150;

/**
 * The keychain read, retried.
 *
 * An absent token is not an error here: `getItemAsync` resolves to `null` for
 * a phone that was never signed in, so a signed out launch never pays for a
 * single retry. Only a thrown read comes back around, and a read that keeps
 * throwing still throws, so a genuine misconfiguration stays visible instead
 * of turning into a silent "no token".
 */
const readSecureValue = async (
  key: StorageKeys,
  attempt = 1,
): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    if (attempt >= KEYCHAIN_READ_ATTEMPTS) throw error;

    await wait(KEYCHAIN_RETRY_DELAY_MS * attempt);
    return readSecureValue(key, attempt + 1);
  }
};

export const getData = async <T extends StorageKeys>(key: T) => {
  if (key === StorageKeys.Token) {
    const secureValue = await readSecureValue(key);
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
