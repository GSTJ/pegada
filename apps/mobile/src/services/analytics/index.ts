import type {
  AnalyticsPersonProperties,
  MobileEventName,
  MobileEventProperties,
} from "@pegada/shared/analytics/events";

import { getExpoPostHog, observability } from "@/services/observability";

/**
 * The catalogue in `@pegada/shared/analytics/events` decides both halves of a
 * call: `event_type` only accepts a name that exists there, and
 * `event_properties` only accepts that name's shape. An event with no
 * properties takes no `event_properties` at all, so a stray object on
 * "Logout Pressed" is a compile error rather than a column nobody queries.
 */
type TrackEvent<Name extends MobileEventName> = {
  event_type: Name;
} & (undefined extends MobileEventProperties[Name]
  ? { event_properties?: undefined }
  : { event_properties: MobileEventProperties[Name] });

type ScreenViewed = {
  screen: string;
  referringScreen?: string;
};

/**
 * Keeps the Amplitude-era call shape (`{ event_type, event_properties }`) that
 * every existing call site is written in, mapping it onto the shared client's
 * `capture(name, properties)`.
 *
 * The cast is the one place the typed catalogue meets the client's untyped
 * `Record<string, unknown>`. Properties are read-only from here on, and the
 * client flattens nested objects and drops `undefined` on the way in.
 */
const track = <Name extends MobileEventName>(event: TrackEvent<Name>) => {
  observability.capture(
    event.event_type,
    event.event_properties as Record<string, unknown> | undefined,
  );
};

/**
 * Screen views go straight to `posthog-react-native`. `$screen` is a mobile-only
 * event with its own SDK method, and the shared client surface deliberately
 * stops at `capture`/`captureError`/`identify` rather than growing a method
 * four platforms out of five cannot implement. `null` when there is no key,
 * which is the same silence every other path gets.
 */
const screenViewed = ({ screen, referringScreen }: ScreenViewed) => {
  getExpoPostHog()?.screen(
    screen,
    referringScreen ? { referringScreen } : undefined,
  );
};

const identify = (userId?: string, properties?: AnalyticsPersonProperties) => {
  if (!userId) return;
  observability.identify(userId, properties);
};

/**
 * Adds to the person record without claiming to be a fresh login.
 *
 * The same call as {@link identify}, under the name the late call sites mean:
 * PostHog has no separate endpoint for this, and `identify` with the distinct
 * id the person already has merges the properties in. Kept as an alias so the
 * places that learn a fact after login (the dog list resolving, the push prompt
 * being answered) read as what they are.
 */
const setPersonProperties = identify;

/**
 * Forgets the current person, so the next session starts on a new anonymous id.
 *
 * Without this, every event fired after a logout on a shared device is still
 * attributed to whoever logged in first, and the sign-in funnel counts a
 * returning person as a converting one.
 */
const reset = () => {
  observability.reset();
};

export const analytics = {
  track,
  screenViewed,
  identify,
  setPersonProperties,
  reset,
};
