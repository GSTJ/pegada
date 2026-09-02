import type { Session } from "@pegada/api/trpc";

import type { NextRequest } from "next/server";

import { appRouter, createTRPCContext } from "@pegada/api";
import { config } from "@pegada/api/shared/config";
import { getSession } from "@pegada/api/trpc";
import { RequestHeaders } from "@pegada/shared/types/types";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { checkRateLimit, createRateLimiter } from "@/lib/rate-limit";

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

// No `prefix`: this limiter has been counting under `@upstash/ratelimit`'s
// default key namespace since it was written, and naming it now would reset
// every live counter.
const loggedOutRatelimit = createRateLimiter({ limit: 15, window: "30s" });

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

  const { allowed, limit, remaining, reset } = await checkRateLimit({
    headers: req.headers,
    limiter: loggedOutRatelimit,
  });

  if (allowed) return;

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
  const session = getSession(
    req.headers.get(RequestHeaders.Authorization) ?? "",
  );

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
            // oxlint-disable-next-line no-console -- Server-side request log, development only.
            console.error(`>>> tRPC Error on '${path}'`, error);
          }
        : undefined,
  });

  setCorsHeaders(response);

  return response;
};

export { handler as GET, handler as POST };
