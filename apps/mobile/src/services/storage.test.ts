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
