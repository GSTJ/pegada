/**
 * `payments.logOut()` throws when RevenueCat has no singleton to log out of,
 * which is the normal state in a dev build and after an anonymous session. It
 * sat between the cache clear and the analytics reset, so the throw walked past
 * the reset and the next person to sign in on that device inherited the
 * previous one's PostHog identity. The reset is in a `finally` for that reason.
 */
jest.mock<Record<string, unknown>>("expo-router", () => ({
  router: { replace: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { reset: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/payments", () => ({
  payments: { logOut: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/query-client", () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/storage", () => ({
  deleteData: jest.fn(),
  StorageKeys: { Token: "token" },
}));

jest.mock<Record<string, unknown>>(
  "@/services/linking/handlers/initial-notification",
  () => ({ setInitialNotification: jest.fn() }),
);

jest.mock<Record<string, unknown>>("@/store", () => ({
  store: { dispatch: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/store/reducers/dogs", () => ({
  Actions: { logout: { logout: () => ({ type: "logout" }) } },
}));

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { payments } from "@/services/payments";

import { logout } from "./logout";

const mockLogOut = jest.mocked(payments.logOut);
const mockReset = jest.mocked(analytics.reset);
const mockSendError = jest.mocked(sendError);

describe("logout", () => {
  it("resets the analytics identity on a clean logout", async () => {
    mockLogOut.mockResolvedValue(undefined);

    await logout();

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("still resets when RevenueCat refuses to log out", async () => {
    mockLogOut.mockRejectedValue(new Error("There is no singleton instance."));

    await logout();

    expect(mockSendError).toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
