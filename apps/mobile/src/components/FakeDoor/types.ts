/**
 * The features the app advertises before they exist, so demand can be
 * measured before anything big gets built. Mirrors the zod enum in
 * `packages/api/src/routes/feature-interest.ts`, so the two lists have to stay
 * in step, since the server rejects any id it does not know.
 */
export type FakeDoorFeature = "referral_reward" | "ai_story_video";

/**
 * Which surface the row was rendered on. Only the share sheet carries fake
 * doors today, and the property is still sent so a second surface can be added
 * without splitting the funnel across event names.
 */
export type FakeDoorSource = "share_sheet";
