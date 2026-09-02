/**
 * Two different things travel in `?ref=`, and conflating them is how a share
 * link ends up attributed to nobody.
 *
 * A user id is what the app puts on a link it generates. A channel token is
 * what a human types once and pastes into a profile: `ref=ig` in the Instagram
 * bio, and whatever the next channel is called. The signup path resolves the
 * value against the User table and stores it as a referrer or as a raw source
 * depending on which it turns out to be, so both need to survive validation.
 */

/**
 * A Pegada id. Prisma's `@default(cuid())` is 25 lowercase alphanumerics; the
 * bounds are a little wider so a cuid2 id or a shorter fixture still passes.
 * Used for dog ids, and to decide whether a `ref` could be a user id at all.
 */
export const REFERRAL_ID_REGEX = /^[a-z0-9]{20,32}$/;

export const isReferralId = (value: unknown): value is string =>
  typeof value === "string" && REFERRAL_ID_REGEX.test(value);

/**
 * Anything `?ref=` is allowed to carry: an id, or a short channel token.
 *
 * Wide enough for `ig`, narrow enough that nothing with a slash, a dot, a
 * space, a percent escape or a quote reaches a database query, an App Store
 * campaign token or a Play install referrer. These values are typed by hand
 * and arrive from the open internet, so the character set is the guardrail.
 */
export const REFERRAL_REF_REGEX = /^[a-zA-Z0-9_-]{2,32}$/;

export const isReferralRef = (value: unknown): value is string =>
  typeof value === "string" && REFERRAL_REF_REGEX.test(value);
