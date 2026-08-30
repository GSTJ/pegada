import * as Location from "expo-location";

import { getTrcpContext } from "@/contexts/trcp-context";
import { sendError } from "@/services/error-tracking";

export enum UpdateLocationError {
  PermissionNotGranted = "Location permission not granted",
}

const getApproximatedPosition = async () => {
  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
  });

  if (lastKnownPosition) return lastKnownPosition.coords;

  const currentPostion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,
  });

  return currentPostion.coords;
};

/**
 * City / state / country are display copy — they name the coordinates on the
 * Profile row and nowhere else. The coordinates themselves are what the deck
 * is built from: `SuggestionService.getPotentialMatches` orders every card by
 * `ST_DistanceSphere` against `User.latitude/longitude`, and a user with NULL
 * coordinates sorts into the last distance bucket of everyone's stack and
 * sees `distance: null` on every card.
 *
 * So the reverse geocode is not allowed to take the write down with it. It is
 * a network round-trip to Apple/Google's geocoder, it fails offline, and it
 * has no backend at all on a bare Android emulator image — before this, one
 * throw from it discarded a location the user had just granted, with only a
 * generic "something went wrong" alert to show for it.
 */
const reverseGeocode = async (position: {
  latitude: number;
  longitude: number;
}) => {
  try {
    const [place] = await Location.reverseGeocodeAsync(position);

    return {
      city: place?.city ?? null,
      state: place?.region ?? null,
      country: place?.country ?? null,
    };
  } catch (error) {
    sendError(error);
    return { city: null, state: null, country: null };
  }
};

export const updateUserLocation = async (newLocation?: {
  longitude: number;
  latitude: number;
}) => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error(UpdateLocationError.PermissionNotGranted);
  }

  const position = newLocation ?? (await getApproximatedPosition());

  const location = {
    latitude: position.latitude,
    longitude: position.longitude,
    ...(await reverseGeocode(position)),
  };

  const newUserData =
    await getTrcpContext().client.user.update.mutate(location);

  getTrcpContext().myDog.get.setData(undefined, (oldDogData) => {
    if (!oldDogData) return undefined;
    return {
      ...oldDogData,
      user: {
        ...newUserData,
        ...location,
      },
    };
  });

  return newUserData;
};
