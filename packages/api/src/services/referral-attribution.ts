import prisma from "@pegada/database";
import { isReferralId, isReferralRef } from "@pegada/shared/utils/referral";

import { sendEvent } from "../errors/errors";

/** What a share link can tell us, once it has been through the input schema. */
export type ReferralInput = {
  /** A user id from a generated link, or a channel token like `ig`. */
  ref: string;
  referredDogId?: string;
};

/** Where the tap happened, for splitting the readout by store. */
export type ReferralPlatform = "ios" | "android" | "web";

/** The columns to write. `null` means "attribute nothing and say nothing". */
export type ReferralAttribution = {
  ref: string;
  referredByUserId: string | null;
  referredDogId: string | null;
  referralSource: string | null;
};

/**
 * Decide what a login should attribute, if anything.
 *
 * `ref` is resolved against the User table rather than trusted: a value that
 * names a real account becomes a referrer, and anything else is kept as a raw
 * source. That is what lets one parameter serve both a link the app generated
 * and a channel token a human typed into a profile bio, without the readout
 * having to guess which it was looking at.
 *
 * Returns non-null only when the account does not exist yet, because these are
 * write-once columns: an account that is already there either has its
 * attribution or was never attributed, and a second share link opened months
 * later must not rewrite either answer. Callers put the result in the `create`
 * branch of their upsert, so the database enforces the same rule a second time.
 *
 * Everything unusable resolves to `null` rather than throwing. A link
 * truncated by a chat app, or someone forwarding their own link back to
 * themselves, is not a reason to fail a login.
 */
export const attributionForNewAccount = async ({
  email,
  referral,
}: {
  email: string;
  referral?: ReferralInput;
}): Promise<ReferralAttribution | null> => {
  if (!referral) return null;
  if (!isReferralRef(referral.ref)) return null;

  const referredDogId = isReferralId(referral.referredDogId)
    ? referral.referredDogId
    : null;

  const [existing, referrer] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    // Only an id-shaped `ref` can name a user, and asking the database about
    // `ig` would be a query that can only ever come back empty.
    isReferralId(referral.ref)
      ? prisma.user.findUnique({
          where: { id: referral.ref },
          select: { id: true, email: true, deletedAt: true },
        })
      : null,
  ]);

  if (existing) return null;

  const isUsableReferrer =
    referrer !== null &&
    !referrer.deletedAt &&
    // Self-referral. Compared on email because that is the identity the login
    // is being performed under; its account row may not exist yet.
    referrer.email !== email;

  if (isUsableReferrer) {
    return {
      ref: referral.ref,
      referredByUserId: referrer.id,
      referredDogId,
      referralSource: null,
    };
  }

  // An id-shaped ref that resolves to nobody is a dead link, not a channel.
  // Storing it as a source would put junk in the column the readout groups by.
  if (isReferralId(referral.ref)) return null;

  return {
    ref: referral.ref,
    referredByUserId: null,
    referredDogId,
    referralSource: referral.ref,
  };
};

/** The columns, without the `ref` that is only carried on the event. */
export const attributionColumns = ({
  referredByUserId,
  referredDogId,
  referralSource,
}: ReferralAttribution) => ({
  referredByUserId,
  referredDogId,
  referralSource,
});

/**
 * The numerator of the metric this whole change exists to produce: attributed
 * signups over signups, weekly. Fired once, next to the write that created the
 * account, so the two numbers are counted at the same moment.
 *
 * No email, and no dog name. The properties are ids, a channel token and a
 * platform, all of which are already in the database, so the event adds a
 * timestamp and nothing a person could be identified by.
 */
export const trackSignupAttributed = ({
  userId,
  attribution,
  platform,
}: {
  userId: string;
  attribution: ReferralAttribution;
  platform?: ReferralPlatform;
}) => {
  sendEvent("Signup Attributed", {
    distinctId: userId,
    ref: attribution.ref,
    referredByUserId: attribution.referredByUserId,
    referredDogId: attribution.referredDogId,
    referralSource: attribution.referralSource,
    platform: platform ?? "unknown",
  });
};
