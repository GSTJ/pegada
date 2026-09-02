/**
 * The features the app advertises before they exist, so demand can be
 * measured before anything big gets built. Mirrors the zod enum in
 * `packages/api/src/routes/feature-interest.ts`, so the two lists have to stay
 * in step, since the server rejects any id it does not know.
 */
export type FakeDoorFeature = "referral_reward" | "ai_story_video";

/** Which surface the row the user tapped was rendered on. */
export type FakeDoorSource = "share_sheet" | "empty_deck";
