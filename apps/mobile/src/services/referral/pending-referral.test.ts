import AsyncStorage from "@react-native-async-storage/async-storage";

import { StorageKeys } from "@/services/storage";

import {
  clearPendingReferral,
  getPendingReferral,
  savePendingReferral,
} from "./pending-referral";

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

jest.mock<Partial<typeof import("@/services/error-tracking")>>(
  "@/services/error-tracking",
  () => ({ sendError: jest.fn() }),
);

const asyncStorage = jest.mocked(AsyncStorage);

const SHARER = "cms9es4dr0001wbmv1a2b3c4d";
const DOG = "cms9es4ht0005wbmvmjg1okvo";

const REFERRAL = { ref: SHARER, referredDogId: DOG };

test("stores a referral opened before there is an account", async () => {
  asyncStorage.getItem.mockResolvedValueOnce(null);

  await expect(savePendingReferral(REFERRAL)).resolves.toBe(REFERRAL);

  expect(asyncStorage.setItem).toHaveBeenCalledWith(
    StorageKeys.PendingReferral,
    JSON.stringify(REFERRAL),
  );
});

test("keeps the first referral when a second link is opened", async () => {
  // The link that got someone to install is the one that earned the signup.
  // Overwriting would also make the number move for users who take days to
  // sign up, which is exactly the cohort this measures.
  asyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(REFERRAL));

  await expect(savePendingReferral({ ref: "ig" })).resolves.toStrictEqual(
    REFERRAL,
  );

  expect(asyncStorage.setItem).not.toHaveBeenCalled();
});

test("reads a stored referral back", async () => {
  asyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(REFERRAL));

  await expect(getPendingReferral()).resolves.toStrictEqual(REFERRAL);
});

test("returns nothing when there is no referral stored", async () => {
  asyncStorage.getItem.mockResolvedValueOnce(null);

  await expect(getPendingReferral()).resolves.toBeUndefined();
});

test.each([
  ["the value is not JSON", "{"],
  ["the value is not an object", '"cms9es4dr0001wbmv1a2b3c4d"'],
  ["the ref is missing", JSON.stringify({ referredDogId: DOG })],
  ["the ref could not have come from a link", JSON.stringify({ ref: "a b" })],
])("returns nothing when %s", async (_reason, stored) => {
  // Written by an older build, or edited on a rooted device. Sending it would
  // cost a round trip the server drops on the floor anyway.
  asyncStorage.getItem.mockResolvedValueOnce(stored);

  await expect(getPendingReferral()).resolves.toBeUndefined();
});

test("drops a stored dog id that is not an id, and keeps the ref", async () => {
  asyncStorage.getItem.mockResolvedValueOnce(
    JSON.stringify({ ref: SHARER, referredDogId: 7 }),
  );

  await expect(getPendingReferral()).resolves.toStrictEqual({ ref: SHARER });
});

test("stores a channel token from the bio link", async () => {
  asyncStorage.getItem.mockResolvedValueOnce(null);

  await expect(savePendingReferral({ ref: "ig" })).resolves.toStrictEqual({
    ref: "ig",
  });
});

test("clears the referral once a login has carried it", async () => {
  await clearPendingReferral();

  expect(asyncStorage.removeItem).toHaveBeenCalledWith(
    StorageKeys.PendingReferral,
  );
});

test("survives a storage failure instead of taking the launch with it", async () => {
  asyncStorage.getItem.mockRejectedValueOnce(new Error("disk full"));

  await expect(getPendingReferral()).resolves.toBeUndefined();
});
