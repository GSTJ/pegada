/**
 * The defect: the login mutation ran on TanStack's stock mutation defaults,
 * which are `retry: 0`. Combined with a tRPC client that had no request
 * timeout at all, a single transient failure on the first request of a cold
 * deployment — a queue hop that blipped, a gateway timeout, a dropped
 * connection on app launch — surfaced as "An error occurred while logging in."
 * and stayed there. The user's only recovery was to tap Continue again, which
 * is exactly what made the second attempt work.
 *
 * Retrying auth is only safe if it is narrow. `OTPRequiredError` is thrown on
 * the *happy* path and `InvalidOTPCodeError` on a real rejection; retrying
 * either would resend emails or burn a code the user typed correctly. So the
 * policy below retries transport-level failures and 5xx only, and treats any
 * error carrying an `error_code` as final.
 */
import {
  TRANSIENT_RETRY_ATTEMPTS,
  shouldRetryTransient,
  transientRetryDelayMs,
} from "./transient-retry";

/** The shape tRPC hands `onError` for a server error it could parse. */
const serverError = (httpStatus: number) => ({
  data: { httpStatus, code: "INTERNAL_SERVER_ERROR" },
});

/** The shape the API's errorFormatter emits for an IntentionalError. */
const intentionalError = (error_code: string) => ({
  data: { error: { error_code, code: "UNAUTHORIZED" } },
});

describe("shouldRetryTransient", () => {
  it("retries a network failure, which carries no response data at all", () => {
    expect(
      shouldRetryTransient(0, new TypeError("Network request failed")),
    ).toBe(true);
  });

  it("retries a gateway timeout and the other 5xx", () => {
    expect(shouldRetryTransient(0, serverError(500))).toBe(true);
    expect(shouldRetryTransient(0, serverError(502))).toBe(true);
    expect(shouldRetryTransient(0, serverError(504))).toBe(true);
  });

  it("never retries an intentional error", () => {
    // Retrying OTP_REQUIRED would send the user a second code for one tap.
    expect(shouldRetryTransient(0, intentionalError("OTP_REQUIRED"))).toBe(
      false,
    );
    // Retrying INVALID_OTP_CODE would report a correct code as invalid, since
    // checkVerification consumes the code on the attempt that matched.
    expect(shouldRetryTransient(0, intentionalError("INVALID_OTP_CODE"))).toBe(
      false,
    );
  });

  it("never retries a 4xx, including the rate limiter", () => {
    expect(shouldRetryTransient(0, serverError(400))).toBe(false);
    expect(shouldRetryTransient(0, serverError(401))).toBe(false);
    expect(shouldRetryTransient(0, serverError(429))).toBe(false);
  });

  it("stops once the attempts are spent", () => {
    const error = serverError(500);

    expect(shouldRetryTransient(TRANSIENT_RETRY_ATTEMPTS - 1, error)).toBe(
      true,
    );
    expect(shouldRetryTransient(TRANSIENT_RETRY_ATTEMPTS, error)).toBe(false);
  });

  it("stays unaggressive — a couple of tries, not a storm", () => {
    expect(TRANSIENT_RETRY_ATTEMPTS).toBeGreaterThan(0);
    expect(TRANSIENT_RETRY_ATTEMPTS).toBeLessThanOrEqual(2);
  });
});

describe("transientRetryDelayMs", () => {
  it("backs off between attempts", () => {
    expect(transientRetryDelayMs(1)).toBeGreaterThan(transientRetryDelayMs(0));
  });

  it("stays inside a wait a user will actually sit through", () => {
    for (let attempt = 0; attempt < TRANSIENT_RETRY_ATTEMPTS; attempt++) {
      expect(transientRetryDelayMs(attempt)).toBeLessThanOrEqual(2_000);
    }
  });
});
