/**
 * The defect: this guard threw a bare `Error`, and tRPC has nowhere to put an
 * uncoded throw except INTERNAL_SERVER_ERROR, so a user who already held a
 * session got a 500. The app retries an uncoded 5xx twice (see
 * apps/mobile/src/services/transient-retry.ts), so a single tap on Continue
 * became three requests and three exception rows in the audit.
 *
 * The guard itself is unchanged: it still refuses. What is pinned here is that
 * it refuses with a code, and that the code lands in the 4xx range the client
 * treats as final.
 */
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { createInnerTRPCContext } from "../trpc";
import { authenticationRouter } from "./authentication";

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

const loginAsSignedInUser = () =>
  authenticationRouter
    .createCaller(
      createInnerTRPCContext({ session: { user: { id: "user-1" } } }),
    )
    .login({ email: "someone@pegada.app" });

it("refuses a login from a session that already exists", async () => {
  await expect(loginAsSignedInUser()).rejects.toBeInstanceOf(TRPCError);
});

it("carries a code the client will not retry", async () => {
  const caught = await loginAsSignedInUser().catch((error: unknown) => error);

  expect(caught).toBeInstanceOf(TRPCError);
  expect((caught as TRPCError).code).toBe("CONFLICT");
  // 409, not 500. `shouldRetryTransient` on the app retries a 5xx that carries
  // no error code, which is what turned one tap into three requests.
  expect(getHTTPStatusCodeFromError(caught as TRPCError)).toBe(409);
});
