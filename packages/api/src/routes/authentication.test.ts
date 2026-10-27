/**
 * The defect: login refused any request that carried a verifying token. A
 * token outlives its account (deleted accounts, and the iOS keychain keeps it
 * across reinstalls), echo.get then sends the app to sign in, and every
 * attempt from there answered "Already logged in". No way back in.
 *
 * Pinned here: a request with a session still gets to the login flow.
 */
import { createInnerTRPCContext } from "../trpc";
import { authenticationRouter } from "./authentication";

const login = jest.fn();

jest.mock("../services/authentication-service", () => ({
  AuthenticationService: jest.fn(() => ({ login })),
}));

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

it("lets a request holding a dead account's token sign in again", async () => {
  login.mockResolvedValue({ id: "user-2" });

  const result = await authenticationRouter
    .createCaller(
      createInnerTRPCContext({ session: { user: { id: "deleted-user" } } }),
    )
    .login({ email: "someone@pegada.app", code: "123456" });

  expect(login).toHaveBeenCalledWith(
    expect.objectContaining({ email: "someone@pegada.app", code: "123456" }),
  );
  expect(result.token).toEqual(expect.any(String));
});
