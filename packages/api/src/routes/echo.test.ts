import type { NextRequest } from "next/server";

import { config } from "../shared/config";
import { createInnerTRPCContext } from "../trpc";
import { echoRouter } from "./echo";

jest.mock("../shared/observability", () => ({
  observability: {
    enabled: false,
    disabledReason: "explicitly-disabled",
    capture: jest.fn(),
    captureError: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    register: jest.fn(),
    flush: jest.fn(),
    shutdown: jest.fn(),
  },
  getPostHogNode: jest.fn(() => null),
}));

jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown) => value,
    deserialize: (value: unknown) => value,
  },
}));

/**
 * The floors are read off `config` at call time, so a test sets them the same
 * way an operator sets an environment variable, and puts them back afterwards.
 */
const floors = {
  MIN_APP_VERSION: config.MIN_APP_VERSION,
  MIN_APP_VERSION_IOS: config.MIN_APP_VERSION_IOS,
  MIN_APP_VERSION_ANDROID: config.MIN_APP_VERSION_ANDROID,
};

beforeEach(() => {
  config.MIN_APP_VERSION = "1.5.0";
  config.MIN_APP_VERSION_IOS = undefined;
  config.MIN_APP_VERSION_ANDROID = undefined;
});

afterEach(() => {
  Object.assign(config, floors);
});

/** An anonymous call carrying whatever headers a client chose to send. */
const echo = (headers: Record<string, string>) =>
  echoRouter
    .createCaller(
      createInnerTRPCContext({
        session: null,
        req: { headers: new Headers(headers) } as unknown as NextRequest,
      }),
    )
    .get();

describe("echo.get force update", () => {
  it("gates a build below the shared floor", async () => {
    const result = await echo({ "x-app-version": "1.4.9" });

    expect(result.forceUpdate).toBe(true);
    expect(result.minimumSupportedVersion).toBe("1.5.0");
  });

  it("lets the floor itself and anything above it through", async () => {
    await expect(echo({ "x-app-version": "1.5.0" })).resolves.toMatchObject({
      forceUpdate: false,
    });
    await expect(echo({ "x-app-version": "2.0.0" })).resolves.toMatchObject({
      forceUpdate: false,
    });
  });

  describe("with a release live on one store and in review on the other", () => {
    beforeEach(() => {
      config.MIN_APP_VERSION_IOS = "1.7.2";
    });

    it("gates the platform the release shipped on", async () => {
      const result = await echo({
        "x-app-version": "1.6.2",
        "x-app-platform": "ios",
      });

      expect(result.forceUpdate).toBe(true);
      expect(result.minimumSupportedVersion).toBe("1.7.2");
    });

    it("leaves the platform with nothing to install alone", async () => {
      const result = await echo({
        "x-app-version": "1.6.2",
        "x-app-platform": "android",
      });

      expect(result.forceUpdate).toBe(false);
      expect(result.minimumSupportedVersion).toBe("1.5.0");
    });

    it("holds a client that does not say which platform it is on to the shared floor", async () => {
      const result = await echo({ "x-app-version": "1.6.2" });

      expect(result.forceUpdate).toBe(false);
      expect(result.minimumSupportedVersion).toBe("1.5.0");
    });
  });

  it("applies an Android floor to Android only", async () => {
    config.MIN_APP_VERSION_ANDROID = "1.7.2";

    await expect(
      echo({ "x-app-version": "1.6.2", "x-app-platform": "android" }),
    ).resolves.toMatchObject({ forceUpdate: true });
    await expect(
      echo({ "x-app-version": "1.6.2", "x-app-platform": "ios" }),
    ).resolves.toMatchObject({ forceUpdate: false });
  });

  // The wall has no way out except the store, so every unreadable input has to
  // resolve to "let them in". A throw here would 500 the one query a launch
  // waits on, and a `true` would lock people out on a header we misread.
  describe("failing open", () => {
    it("does not gate a client that sends no version", async () => {
      await expect(echo({})).resolves.toMatchObject({ forceUpdate: false });
    });

    it("does not gate, or throw on, a version it cannot parse", async () => {
      await expect(
        echo({ "x-app-version": "not-a-version" }),
      ).resolves.toMatchObject({ forceUpdate: false });
    });

    it("falls back to the shared floor on an unknown platform", async () => {
      config.MIN_APP_VERSION_IOS = "1.7.2";

      const result = await echo({
        "x-app-version": "1.6.2",
        "x-app-platform": "windows-phone",
      });

      expect(result.forceUpdate).toBe(false);
      expect(result.minimumSupportedVersion).toBe("1.5.0");
    });
  });
});
