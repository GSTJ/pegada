import { get } from "lodash";

/**
 * How many times a transient failure is retried after the first attempt.
 *
 * Two, deliberately. The failure this exists for is a cold first request —
 * one blip, then the stack is warm — so a second try recovers nearly all of
 * it, and a third mostly just delays the error message the user needs to see.
 */
export const TRANSIENT_RETRY_ATTEMPTS = 2;

const BASE_RETRY_DELAY_MS = 400;

/** Exponential backoff, capped so nobody watches a spinner for 30 seconds. */
export const transientRetryDelayMs = (attemptIndex: number) =>
  Math.min(BASE_RETRY_DELAY_MS * 2 ** attemptIndex, 2_000);

/**
 * Is this failure worth another attempt?
 *
 * Errors the product raises on purpose carry an `error_code` (see
 * packages/shared/errors/errors.ts) and are always final — `OTP_REQUIRED` is
 * the happy path and retrying it emails a second code, `INVALID_OTP_CODE`
 * means the code was already consumed and retrying reports a correct code as
 * invalid. Everything else is judged on the HTTP status: 5xx is the server
 * having a bad moment, 4xx is us, and no status at all means the request never
 * produced a parseable response — a dropped connection, a timeout, or the
 * gateway's HTML error page.
 */
export const shouldRetryTransient = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= TRANSIENT_RETRY_ATTEMPTS) return false;

  if (get(error, "data.error.error_code")) return false;

  const httpStatus = get(error, "data.httpStatus");

  if (typeof httpStatus === "number") return httpStatus >= 500;

  // No parseable tRPC envelope: transport-level failure. Worth one more try.
  return true;
};
