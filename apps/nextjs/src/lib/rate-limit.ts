import { sendError } from "@pegada/api/errors/errors";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ipAddress } from "@vercel/functions";

/**
 * Bound how long a hanging Redis call can stall a request. Combined with the
 * fail-open handling in {@link checkRateLimit}, a dead or unreachable Redis
 * degrades to "no rate limiting" instead of a full outage.
 */
const REDIS_TIMEOUT_MS = 2000;

/**
 * Local requests carry no forwarded IP, so every one of them shares this key.
 * That is fine: `next dev` is a single visitor, and on Vercel the proxy always
 * sets the header.
 */
const UNKNOWN_IP = "127.0.0.1";

type RateLimiterOptions = {
  /** How many requests are allowed inside {@link window}. */
  limit: number;
  /**
   * Namespace for the Redis keys. Omitted for the tRPC endpoint, which was
   * counting under `@upstash/ratelimit`'s default long before this helper
   * existed; changing it there would reset every live counter.
   */
  prefix?: string;
  /** Any duration `@upstash/ratelimit` accepts, e.g. `"30s"`, `"1 m"`. */
  window: Parameters<typeof Ratelimit.slidingWindow>[1];
};

export const createRateLimiter = ({
  limit,
  prefix,
  window,
}: RateLimiterOptions) =>
  new Ratelimit({
    limiter: Ratelimit.slidingWindow(limit, window),
    redis: Redis.fromEnv(),
    timeout: REDIS_TIMEOUT_MS,
    ...(prefix === undefined ? {} : { prefix }),
  });

/** The one thing this needs from a request: a header, by name. */
type HeaderReader = { get: (name: string) => string | null | undefined };

/**
 * What the limiter decided, plus the numbers a 429 has to report. `allowed` is
 * true both when the caller is under the limit and when the limiter itself
 * could not be reached.
 */
export type RateLimitVerdict = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const ALLOWED_WITHOUT_REDIS: RateLimitVerdict = {
  allowed: true,
  limit: 0,
  remaining: 0,
  reset: 0,
};

/**
 * Counts one request against `limiter`, keyed by the caller's IP.
 *
 * Redis being unreachable (DNS failure, network error, timeout, auth error)
 * must never take a page down. Fail open: let the request through, and report
 * the outage once so it is visible instead of silently swallowed.
 *
 * `headers` is anything that can be asked for a header by name, which covers
 * both a route handler's `request.headers` and the `headers()` a server action
 * awaits.
 */
export const checkRateLimit = async ({
  headers,
  limiter,
}: {
  headers: HeaderReader;
  limiter: Ratelimit;
}): Promise<RateLimitVerdict> => {
  // Handed a plain reader rather than the object itself: `ipAddress` takes
  // either headers or a request and tells them apart by looking for a
  // `headers` property, and Next's `ReadonlyHeaders` has one, so passing it
  // straight through makes it read the wrong thing.
  const ip =
    ipAddress({ get: (name) => headers.get(name) ?? null }) ?? UNKNOWN_IP;

  let result: Awaited<ReturnType<typeof limiter.limit>>;
  try {
    result = await limiter.limit(ip);
  } catch (error) {
    sendError(error);
    return ALLOWED_WITHOUT_REDIS;
  }

  const { limit, remaining, reset, success, reason } = result;

  // `reason === "timeout"` means the limiter itself couldn't reach Redis in
  // time (see `REDIS_TIMEOUT_MS`) and is not a genuine rate-limit rejection.
  // Fail open here too, rather than blocking real traffic on a dead Redis.
  if (!success && reason === "timeout") {
    sendError(new Error("Rate limiter timed out reaching Redis"));
    return { allowed: true, limit, remaining, reset };
  }

  return { allowed: success, limit, remaining, reset };
};
