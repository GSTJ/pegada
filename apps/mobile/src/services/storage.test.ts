import * as SecureStore from "expo-secure-store";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { deleteData, getData, StorageKeys, storeData, Theme } from "./storage";

jest.mock<
  Partial<typeof import("@react-native-async-storage/async-storage").default>
>("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock<Partial<typeof import("expo-secure-store")>>(
  "expo-secure-store",
  () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  }),
);

const asyncStorage = jest.mocked(AsyncStorage);
const secureStore = jest.mocked(SecureStore);

test("stores tokens in encrypted storage", async () => {
  await storeData(StorageKeys.Token, "signed-token");

  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    StorageKeys.Token,
    "signed-token",
  );
  expect(asyncStorage.setItem).not.toHaveBeenCalled();
  expect(asyncStorage.removeItem).toHaveBeenCalledWith(StorageKeys.Token);
});

test("migrates a legacy token when it is first read", async () => {
  secureStore.getItemAsync.mockResolvedValueOnce(null);
  asyncStorage.getItem.mockResolvedValueOnce("legacy-token");

  await expect(getData(StorageKeys.Token)).resolves.toBe("legacy-token");
  expect(secureStore.setItemAsync).toHaveBeenCalledWith(
    StorageKeys.Token,
    "legacy-token",
  );
  expect(asyncStorage.removeItem).toHaveBeenCalledWith(StorageKeys.Token);
});

test("looks again when the keychain is not ready for the first read", async () => {
  secureStore.getItemAsync
    .mockRejectedValueOnce(
      new Error("Calling the 'getValueWithKeyAsync' function has failed"),
    )
    .mockResolvedValueOnce("signed-token");

  await expect(getData(StorageKeys.Token)).resolves.toBe("signed-token");
  expect(secureStore.getItemAsync).toHaveBeenCalledTimes(2);
  expect(asyncStorage.getItem).not.toHaveBeenCalled();
});

test("gives the keychain error back when every read fails", async () => {
  const failure = new Error(
    "Calling the 'getValueWithKeyAsync' function has failed",
  );
  secureStore.getItemAsync
    .mockRejectedValueOnce(failure)
    .mockRejectedValueOnce(failure)
    .mockRejectedValueOnce(failure);

  await expect(getData(StorageKeys.Token)).rejects.toBe(failure);
  expect(secureStore.getItemAsync).toHaveBeenCalledTimes(3);
});

test("does not retry a phone that simply has no token", async () => {
  secureStore.getItemAsync.mockResolvedValueOnce(null);
  asyncStorage.getItem.mockResolvedValueOnce(null);

  await expect(getData(StorageKeys.Token)).resolves.toBeNull();
  expect(secureStore.getItemAsync).toHaveBeenCalledTimes(1);
});

test("removes current and legacy token copies on logout", async () => {
  await deleteData(StorageKeys.Token);

  expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.Token);
  expect(asyncStorage.removeItem).toHaveBeenCalledWith(StorageKeys.Token);
});

test("keeps non-sensitive preferences in AsyncStorage", async () => {
  await storeData(StorageKeys.Theme, Theme.Dark);

  expect(asyncStorage.setItem).toHaveBeenCalledWith(
    StorageKeys.Theme,
    Theme.Dark,
  );
  expect(secureStore.setItemAsync).not.toHaveBeenCalled();
});
