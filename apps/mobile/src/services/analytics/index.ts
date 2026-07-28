import { observability, getExpoPostHog } from "@/services/observability";

// The call sites pass loose values (Dates, nested objects, optionals) that
// Amplitude accepted as `any`. The shared client flattens nested objects to
// dotted keys and drops `undefined` on the way in, so the loose shape is
// coerced once here rather than editing every event object.
type LooseProperties = Record<string, unknown>;

type TrackEvent = {
  event_type: string;
  event_properties?: LooseProperties;
};

type ScreenViewed = {
  screen: string;
  referringScreen?: string;
};

// Keeps the Amplitude-era call shape (`{ event_type, event_properties }`) so
// the ~30 existing call sites don't change, mapping it onto the shared
// client's capture(name, properties) / identify(id, props).
const track = ({ event_type, event_properties }: TrackEvent) => {
  observability.capture(event_type, event_properties);
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

const identify = (userId?: string, properties?: LooseProperties) => {
  if (!userId) return;
  observability.identify(userId, properties);
};

export const analytics = {
  track,
  screenViewed,
  identify,
};
