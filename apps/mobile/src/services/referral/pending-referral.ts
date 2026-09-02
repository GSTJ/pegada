import type { Referral } from "./parse-referral-from-url";

import { isReferralId, isReferralRef } from "@pegada/shared/utils/referral";

import { sendError } from "@/services/error-tracking";
import {
  deleteData,
  getData,
  StorageKeys,
  storeData,
} from "@/services/storage";

/**
 * The gap this bridges: a link is opened before there is an account to attach
 * it to. The user lands on a dog profile, browses, maybe closes the app, and
 * signs up later. Attribution has to survive all of that, so it is written to
 * disk the moment the link is read and only removed once a login has carried
 * it to the server.
 *
 * Storage failures are reported and swallowed. Losing an attribution is a hole
 * in a metric; a throw here would be a hole in the launch path, since this runs
 * from the root layout's effect.
 */

/**
 * First one wins. Someone who opens three friends' links before signing up is
 * attributed to the friend whose link got them to install, not to the last one
 * they happened to tap. Overwriting would also make the number unstable in the
 * exact case the metric cares about: a user who takes days to sign up.
 */
export const savePendingReferral = async (referral: Referral) => {
  try {
    const existing = await getPendingReferral();
    if (existing) return existing;

    await storeData(StorageKeys.PendingReferral, JSON.stringify(referral));
    return referral;
  } catch (error) {
    sendError(error);
    return undefined;
  }
};

export const getPendingReferral = async (): Promise<Referral | undefined> => {
  try {
    const stored = await getData(StorageKeys.PendingReferral);
    if (!stored) return undefined;

    const parsed: unknown = JSON.parse(stored);

    // Re-validated on the way out. The value has been sitting on disk across
    // app versions, and the server rejects a bad id anyway, so the only thing
    // sending one would achieve is a login round trip that drops it silently.
    if (typeof parsed !== "object" || parsed === null) return undefined;

    const { ref, referredDogId } = parsed as Record<string, unknown>;

    if (!isReferralRef(ref)) return undefined;

    return {
      ref,
      ...(isReferralId(referredDogId) ? { referredDogId } : {}),
    };
  } catch (error) {
    sendError(error);
    return undefined;
  }
};

export const clearPendingReferral = async () => {
  try {
    await deleteData(StorageKeys.PendingReferral);
  } catch (error) {
    sendError(error);
  }
};
