import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PushRegistrationState } from "./pushRegistrationState";

describe("PushRegistrationState", () => {
  it("invalidates registration work that was already in progress", () => {
    const state = new PushRegistrationState();
    const registration = state.begin();

    state.invalidate();

    assert.equal(state.enabled, false);
    assert.equal(registration.isCurrent(), false);
  });

  it("blocks a native registration that resumes after logout", async () => {
    const state = new PushRegistrationState();
    const registration = state.begin();
    let resumePermissionCheck: (() => void) | undefined;
    const permissionCheck = new Promise<void>((resolve) => {
      resumePermissionCheck = resolve;
    });
    let nativeRegistrations = 0;
    const pendingRegistration = (async () => {
      await permissionCheck;
      if (registration.isCurrent()) nativeRegistrations += 1;
    })();

    state.invalidate();
    resumePermissionCheck?.();
    await pendingRegistration;

    assert.equal(nativeRegistrations, 0);
  });

  it("lets only the latest registration generation mutate native state", () => {
    const state = new PushRegistrationState();
    const olderRegistration = state.begin();
    const latestRegistration = state.begin();

    assert.equal(olderRegistration.isCurrent(), false);
    assert.equal(latestRegistration.isCurrent(), true);
  });

  it("can begin a new authenticated registration after logout invalidation", () => {
    const state = new PushRegistrationState();
    state.invalidate();

    const nextSessionRegistration = state.begin();

    assert.equal(state.enabled, true);
    assert.equal(nextSessionRegistration.isCurrent(), true);
  });
});
