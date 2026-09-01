import {
  ANALYTICS_EVENTS,
  MOBILE_EVENT_NAMES,
  SERVER_EVENT_NAMES,
} from "@pegada/shared/analytics/events";

/**
 * The catalogue's job is to stop two people inventing two names for one event.
 * These are the checks a type cannot make: that no two constants resolve to the
 * same string, and that the runtime lists the tests and tooling read still
 * describe the same catalogue the types do.
 *
 * It lives in the mobile package because that is the workspace whose test
 * runner needs no database.
 */
describe("analytics catalogue", () => {
  const names = Object.values(ANALYTICS_EVENTS);

  it("gives every event a distinct name", () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps names human-readable, which is how they read in PostHog", () => {
    for (const name of names) {
      expect(name.trim()).toBe(name);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("lists only catalogued names on the mobile side", () => {
    for (const name of MOBILE_EVENT_NAMES) {
      expect(names).toContain(name);
    }

    expect(new Set(MOBILE_EVENT_NAMES).size).toBe(MOBILE_EVENT_NAMES.length);
  });

  it("lists only catalogued names on the server side", () => {
    for (const name of SERVER_EVENT_NAMES) {
      expect(names).toContain(name);
    }

    expect(new Set(SERVER_EVENT_NAMES).size).toBe(SERVER_EVENT_NAMES.length);
  });

  it("covers every catalogued name from at least one side", () => {
    const covered = new Set<string>([
      ...MOBILE_EVENT_NAMES,
      ...SERVER_EVENT_NAMES,
    ]);

    expect(names.filter((name) => !covered.has(name))).toStrictEqual([]);
  });

  it("keeps the names already in PostHog exactly as they were sent", () => {
    // Renaming any of these splits a live series in two. Each one is a name
    // that shipped before the catalogue existed.
    expect(ANALYTICS_EVENTS.INVALID_OTP_TYPED).toBe(
      "User Typed Invalid OTP code",
    );
    expect(ANALYTICS_EVENTS.RESTORE_PURCHASES).toBe("RestorePurchases");
    expect(ANALYTICS_EVENTS.RESTORE_PURCHASES_SUCCESS).toBe(
      "Restore Purchases Success",
    );
    expect(ANALYTICS_EVENTS.LIKE_LIMIT_REACHED).toBe("Like Limit Reached");
    expect(ANALYTICS_EVENTS.SAVE_PREFERENCES_PRESSED).toBe(
      "Save Preferences Pressed",
    );
    expect(ANALYTICS_EVENTS.UPGRADE).toBe("Upgrade");
    expect(ANALYTICS_EVENTS.NEW_MATCH).toBe("New Match");
    expect(ANALYTICS_EVENTS.SWIPE_BACK).toBe("Swipe Back");
  });
});
