/**
 * The wrapper is a few lines of glue, and every one of them fails silently: an
 * event that never reaches `capture`, an identify that runs with no user, a
 * reset that was never wired to logout. None of those throw, so the only way to
 * know they work is to watch the client underneath.
 */
jest.mock<Record<string, unknown>>("@/services/observability", () => ({
  observability: {
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  },
  getExpoPostHog: () => null,
}));

import { observability } from "@/services/observability";

import { analytics } from "./index";

const mockClient = observability as unknown as {
  capture: jest.Mock;
  identify: jest.Mock;
  reset: jest.Mock;
};

describe("analytics wrapper", () => {
  it("passes the event name and properties straight through", () => {
    analytics.track({
      event_type: "Paywall Viewed",
      event_properties: { trigger: "like_limit" },
    });

    expect(mockClient.capture).toHaveBeenCalledWith("Paywall Viewed", {
      trigger: "like_limit",
    });
  });

  it("sends an event with no properties as undefined rather than an empty object", () => {
    analytics.track({ event_type: "Sign In Email Submitted" });

    expect(mockClient.capture).toHaveBeenCalledWith(
      "Sign In Email Submitted",
      undefined,
    );
  });

  it("identifies a known user", () => {
    analytics.identify("user-1", { plan: "PREMIUM", dogs_count: 1 });

    expect(mockClient.identify).toHaveBeenCalledWith("user-1", {
      plan: "PREMIUM",
      dogs_count: 1,
    });
  });

  it("does not identify without a user id", () => {
    // Anonymous events still belong to the anonymous person the SDK already
    // has. Identifying `undefined` would claim a person that does not exist.
    analytics.identify(undefined, { plan: "FREE" });

    expect(mockClient.identify).not.toHaveBeenCalled();
  });

  it("merges person properties onto an existing person", () => {
    analytics.setPersonProperties("user-1", {
      push_permission_status: "granted",
    });

    expect(mockClient.identify).toHaveBeenCalledWith("user-1", {
      push_permission_status: "granted",
    });
  });

  it("ignores person properties when there is nobody to attach them to", () => {
    analytics.setPersonProperties(undefined, {
      push_permission_status: "denied",
    });

    expect(mockClient.identify).not.toHaveBeenCalled();
  });

  it("forgets the person on reset", () => {
    analytics.reset();

    expect(mockClient.reset).toHaveBeenCalledTimes(1);
  });
});
