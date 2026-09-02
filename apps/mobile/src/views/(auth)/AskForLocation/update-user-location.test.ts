/**
 * The defect: `updateUserLocation` awaited `Location.reverseGeocodeAsync`
 * BEFORE `user.update.mutate`, unguarded. City/state/country are display copy;
 * latitude/longitude are what the whole swipe deck is ordered by. One throw
 * from the geocoder — offline, rate-limited, or an Android emulator image with
 * no geocoder backend — discarded a location the user had just granted.
 *
 * The user then sees "something went wrong", lands on an empty-feeling deck,
 * and their row keeps NULL coordinates. `maestro-fresh@pegada.app`, the only
 * account in the dev database ever created through the app, is in exactly that
 * state: dog created, photo approved, `latitude` NULL.
 */

const mockMutate = jest.fn();
const mockSetData = jest.fn();

const mockGetForegroundPermissionsAsync = jest.fn();
const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetLastKnownPositionAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockReverseGeocodeAsync = jest.fn();
const mockSendError = jest.fn();
const mockTrack = jest.fn();

jest.mock<Record<string, unknown>>("expo-location", () => ({
  Accuracy: { Low: 2 },
  getForegroundPermissionsAsync: () =>
    mockGetForegroundPermissionsAsync() as unknown,
  requestForegroundPermissionsAsync: () =>
    mockRequestForegroundPermissionsAsync() as unknown,
  getLastKnownPositionAsync: () => mockGetLastKnownPositionAsync() as unknown,
  getCurrentPositionAsync: () => mockGetCurrentPositionAsync() as unknown,
  reverseGeocodeAsync: (position: unknown) =>
    mockReverseGeocodeAsync(position) as unknown,
}));

jest.mock<Record<string, unknown>>("@/contexts/trcp-context", () => ({
  getTrcpContext: () => ({
    client: { user: { update: { mutate: mockMutate } } },
    myDog: { get: { setData: mockSetData } },
  }),
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: (error: unknown) => mockSendError(error) as unknown,
}));

// Stubbed rather than exercised: the real module reaches PostHog through
// `expo-updates`, which this suite has no reason to load.
jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: (event: unknown) => mockTrack(event) as unknown },
}));

import { updateUserLocation } from "./update-user-location";

const SF = { latitude: 37.7749, longitude: -122.4194 };

beforeEach(() => {
  // The state a first-run user is in: never asked, so the request below is the
  // one that puts a dialog on screen.
  mockGetForegroundPermissionsAsync.mockResolvedValue({
    status: "undetermined",
    canAskAgain: true,
  });
  mockRequestForegroundPermissionsAsync.mockResolvedValue({
    status: "granted",
  });
  mockGetLastKnownPositionAsync.mockResolvedValue({ coords: SF });
  mockReverseGeocodeAsync.mockResolvedValue([
    { city: "San Francisco", region: "CA", country: "USA" },
  ]);
  mockMutate.mockImplementation((input: unknown) => Promise.resolve(input));
});

describe("updateUserLocation", () => {
  it("persists the place name when the geocoder answers", async () => {
    await updateUserLocation();

    expect(mockMutate).toHaveBeenCalledWith({
      ...SF,
      city: "San Francisco",
      state: "CA",
      country: "USA",
    });
  });

  it("still persists the coordinates when the geocoder throws", async () => {
    mockReverseGeocodeAsync.mockRejectedValue(
      new Error("geocoder unavailable"),
    );

    await updateUserLocation();

    expect(mockMutate).toHaveBeenCalledWith({
      ...SF,
      city: null,
      state: null,
      country: null,
    });
    expect(mockSendError).toHaveBeenCalled();
  });

  it("still persists the coordinates when the geocoder finds no place", async () => {
    mockReverseGeocodeAsync.mockResolvedValue([]);

    await updateUserLocation();

    expect(mockMutate).toHaveBeenCalledWith({
      ...SF,
      city: null,
      state: null,
      country: null,
    });
  });

  it("refuses to write anything without permission", async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: "denied",
    });

    await expect(updateUserLocation()).rejects.toThrow(
      "Location permission not granted",
    );
    expect(mockMutate).not.toHaveBeenCalled();
    // The refusal is the interesting half of the onboarding funnel, so it has
    // to be recorded before the throw walks away with it.
    expect(mockTrack).toHaveBeenCalledWith({
      event_type: "Location Permission",
      event_properties: { status: "denied" },
    });
  });

  it("says nothing about permission when the OS never asked", async () => {
    // LocationMap's manual re-pick runs this with permission already granted.
    // The OS shows no dialog, so there is no decision to report.
    mockGetForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
      canAskAgain: false,
    });

    await updateUserLocation();

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("prefers a caller-supplied position over the device's", async () => {
    const dropped = { latitude: 1, longitude: 2 };

    await updateUserLocation(dropped);

    expect(mockGetLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining(dropped));
  });
});
