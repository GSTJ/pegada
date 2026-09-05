/**
 * The defect: the launch query got one attempt, and every failure of it -
 * including the cold start timeout the app already retries everywhere else -
 * landed the user on sign in. A user with a valid token in storage was sent to
 * a screen they were already past, and the login there answers "Already logged
 * in", so there was no way out but reinstalling.
 *
 * A token on disk outlives a failed request. It is the only evidence of a
 * session this function has when nothing answers, so it decides the fallback.
 *
 * Every React Native flavoured import is stubbed, matching the other tests in
 * this package: there is no RN transform here.
 */
import { getTrcpContext } from "@/contexts/trcp-context";
import { getData } from "@/services/storage";
import { TRANSIENT_RETRY_ATTEMPTS } from "@/services/transient-retry";
import { SceneName } from "@/types/scene-name";

import { getInitialRouteName } from "./get-initial-route-name";

jest.mock<Record<string, unknown>>("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock<Record<string, unknown>>("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "1.7.2" } },
}));

jest.mock<Record<string, unknown>>("@/contexts/trcp-context", () => ({
  getTrcpContext: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { identify: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/force-update", () => ({
  rememberMinimumSupportedVersion: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/get-logged-user-id", () => ({
  getLoggedUserID: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/storage", () => ({
  getData: jest.fn(),
  StorageKeys: { Token: "token" },
}));

const echoQuery = jest.fn();
const myDogFetch = jest.fn();

const mockGetData = jest.mocked(getData);

/** The failure this function is built around: an attempt that never answered. */
const timedOut = () => Promise.reject(new TypeError("Aborted"));

const dogWithLocation = {
  images: [],
  user: { latitude: -23.5, longitude: -46.6 },
};

beforeEach(() => {
  jest.mocked(getTrcpContext).mockReturnValue({
    client: { echo: { get: { query: echoQuery } } },
    myDog: { get: { fetch: myDogFetch } },
  } as unknown as ReturnType<typeof getTrcpContext>);

  echoQuery.mockReset();
  myDogFetch.mockReset();
  myDogFetch.mockResolvedValue(dogWithLocation);
  mockGetData.mockResolvedValue(null);
});

test("opens the app when the launch query never answers and a token is stored", async () => {
  echoQuery.mockImplementation(timedOut);
  mockGetData.mockResolvedValue("stored-token");

  await expect(getInitialRouteName()).resolves.toBe(SceneName.Swipe);
});

test("still sends a device with no token to sign in", async () => {
  echoQuery.mockImplementation(timedOut);

  await expect(getInitialRouteName()).resolves.toBe(SceneName.SignIn);
});

test("retries the launch query instead of giving up on the first timeout", async () => {
  echoQuery.mockImplementation(timedOut);
  mockGetData.mockResolvedValue("stored-token");

  await getInitialRouteName();

  expect(echoQuery).toHaveBeenCalledTimes(TRANSIENT_RETRY_ATTEMPTS + 1);
});

test("routes normally when a retry recovers the launch query", async () => {
  echoQuery
    .mockImplementationOnce(timedOut)
    .mockResolvedValue({ authenticated: true, forceUpdate: false });
  mockGetData.mockResolvedValue("stored-token");

  await expect(getInitialRouteName()).resolves.toBe(SceneName.Swipe);
});

test("sends the user to sign in when the server answers that the token is not valid", async () => {
  echoQuery.mockResolvedValue({ authenticated: false, forceUpdate: false });
  mockGetData.mockResolvedValue("stored-token");

  // An answer, not a failure: the server looked at the token and refused it.
  await expect(getInitialRouteName()).resolves.toBe(SceneName.SignIn);
  expect(echoQuery).toHaveBeenCalledTimes(1);
});

test("keeps a token holder out of sign in when the dog query is the one that fails", async () => {
  echoQuery.mockResolvedValue({ authenticated: true, forceUpdate: false });
  myDogFetch.mockImplementation(timedOut);
  mockGetData.mockResolvedValue("stored-token");

  await expect(getInitialRouteName()).resolves.toBe(SceneName.Swipe);
});
