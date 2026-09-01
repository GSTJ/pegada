const mockCapture = jest.fn();

jest.mock("./observability", () => ({
  observability: {
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}));

import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";

import { captureEvent, secondsBetween } from "./analytics";

describe("captureEvent", () => {
  it("attributes the event to the person, the way posthog-node expects", () => {
    // `magic-observability`'s node adapter reads a `distinctId` property off
    // the event and falls back to "server" without one, so this key is the
    // whole difference between a user's funnel and an unattributed row.
    captureEvent("user-1", ANALYTICS_EVENTS.MESSAGE_SENT, {
      match_id: "match-1",
      message_type: "text",
    });

    expect(mockCapture).toHaveBeenCalledWith("Message Sent", {
      distinctId: "user-1",
      match_id: "match-1",
      message_type: "text",
    });
  });

  it("never lets a telemetry failure reach the caller", () => {
    // The mutation this sits inside must still succeed when PostHog does not.
    mockCapture.mockImplementationOnce(() => {
      throw new Error("posthog is down");
    });

    expect(() =>
      captureEvent("user-1", ANALYTICS_EVENTS.MATCH_CREATED, {
        match_id: "match-1",
        other_user_id: "user-2",
        seconds_since_signup: 10,
      }),
    ).not.toThrow();
  });
});

describe("secondsBetween", () => {
  it("counts whole seconds forward", () => {
    expect(
      secondsBetween(
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-01T00:01:30Z"),
      ),
    ).toBe(90);
  });

  it("floors rather than rounds, so a fraction never reads as a second", () => {
    expect(
      secondsBetween(
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-01T00:00:00.900Z"),
      ),
    ).toBe(0);
  });

  it("clamps clock skew to zero instead of reporting a negative age", () => {
    expect(
      secondsBetween(
        new Date("2026-01-01T00:01:00Z"),
        new Date("2026-01-01T00:00:00Z"),
      ),
    ).toBe(0);
  });
});
