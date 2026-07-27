import { posthog } from "@/services/posthog";

// PostHog's property type is derived from the client so it always matches.
type EventProperties = NonNullable<Parameters<typeof posthog.capture>[1]>;

// The call sites pass loose values (Dates, nested objects, optionals) that
// Amplitude accepted as `any`. PostHog JSON-serializes properties the same
// way at send time, so we accept the loose shape here and coerce once at the
// boundary rather than editing every event object.
type LooseProperties = Record<string, unknown>;

const toEventProperties = (properties?: LooseProperties) =>
  properties as EventProperties | undefined;

type TrackEvent = {
  event_type: string;
  event_properties?: LooseProperties;
};

type ScreenViewed = {
  screen: string;
  referringScreen?: string;
};

// Keeps the Amplitude-era call shape (`{ event_type, event_properties }`)
// so the existing call sites don't change, mapping it onto PostHog's
// capture(name, properties) / screen(name, properties) / identify(id, props).
const track = ({ event_type, event_properties }: TrackEvent) => {
  posthog.capture(event_type, toEventProperties(event_properties));
};

const screenViewed = ({ screen, referringScreen }: ScreenViewed) => {
  posthog.screen(screen, referringScreen ? { referringScreen } : undefined);
};

const identify = (userId?: string, properties?: LooseProperties) => {
  posthog.identify(userId, toEventProperties(properties));
};

export const analytics = {
  track,
  screenViewed,
  identify,
};
