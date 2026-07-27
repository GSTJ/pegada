import type { dogSafeSchema } from "../dtos/dog-dto";
import type { PlanType } from "@prisma/client";
import type { z } from "zod";

import { getDistance } from "geolib";

type DogSafeSchema = z.infer<typeof dogSafeSchema>;

export type WithUser = Omit<DogSafeSchema, "distance" | "user"> & {
  user: { latitude?: number | null; longitude?: number | null; plan: PlanType };
};

/**
 * Swap a dog's owner for the distance between that owner and `user`.
 *
 * Lives here rather than on SwipeService because MatchService and DogService
 * both need it, and reaching into SwipeService for it made those three modules
 * a cycle (`import/no-cycle`). It is a pure function of two coordinates.
 */
export const transformDistanceBetweenUserAndDog = <
  T extends WithUser,
  V extends WithUser["user"],
>(
  dog: T,
  user: V,
): DogSafeSchema => {
  const { user: owner, ...dogWithoutOwner } = dog;

  if (
    !owner?.latitude ||
    !owner?.longitude ||
    !user?.latitude ||
    !user?.longitude
  ) {
    return {
      ...dogWithoutOwner,
      distance: null,
      user: { plan: user.plan },
    };
  }

  const distanceInMeters = getDistance(
    { latitude: owner.latitude, longitude: owner.longitude },
    { latitude: user.latitude, longitude: user.longitude },
    1000,
  );

  return {
    ...dogWithoutOwner,
    user: { plan: user.plan },
    distance: distanceInMeters / 1000,
  };
};
