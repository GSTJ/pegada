import { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ipAddress } from "@vercel/functions";

import { appRouter, createTRPCContext } from "@pegada/api";
import { sendError } from "@pegada/api/errors/errors";
import { config } from "@pegada/api/shared/config";
import { getSession, Session } from "@pegada/api/trpc";
import { RequestHeaders } from "@pegada/shared/types/types";

const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
};

const loggedOutRatelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(15, "30s"),
  redis: Redis.fromEnv(),
  // Bound how long a hanging Redis call can stall a request. Combined with
  // the fail-open handling below, a dead/unreachable Redis degrades to "no
  // rate limiting" instead of a full outage.
  timeout: 2000,
});

// Redis being unreachable (DNS failure, network error, timeout, auth error)
// must never take the whole API down. Fail open: let the request through,
// and report the outage once so it's visible instead of silently swallowed.
const handleRatelimiter = async ({
  req,
  session,
}: {
  req: NextRequest;
  session: Session | null;
}) => {
  const isLoggedIn = Boolean(session?.user.id);

  // We rate limit logged out users
  if (isLoggedIn) {
    return;
  }

  const ip = ipAddress(req) ?? "127.0.0.1";

  let result: Awaited<ReturnType<typeof loggedOutRatelimit.limit>>;
  try {
    result = await loggedOutRatelimit.limit(ip);
  } catch (error) {
    sendError(error);
    return;
  }

  const { limit, remaining, reset, success, reason } = result;

  if (success) return;

  // `reason === "timeout"` means the limiter itself couldn't reach Redis in
  // time (see `timeout` above) and is not a genuine rate-limit rejection.
  // Fail open here too, rather than blocking real traffic on a dead Redis.
  if (reason === "timeout") {
    sendError(new Error("Rate limiter timed out reaching Redis"));
    return;
  }

  return new Response(JSON.stringify({ error: "Rate limited" }), {
    status: 429,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  });
};

const handler = async (req: NextRequest) => {
  const session = getSession(req.headers.get(RequestHeaders.Authorization) ?? "");

  const ratelimited = await handleRatelimiter({ req, session });

  if (ratelimited) {
    return ratelimited;
  }

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () => createTRPCContext({ req, session }),
    onError:
      config.NODE_ENV === "development"
        ? ({ error, path }) => {
            // eslint-disable-next-line no-console
            console.error(`>>> tRPC Error on '${path}'`, error);
          }
        : undefined,
  });

  setCorsHeaders(response);

  return response;
};

export { handler as GET, handler as POST };
