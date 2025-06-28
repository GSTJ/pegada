import { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { appRouter, createTRPCContext } from "@pegada/api";
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
    status: 204
  });
  setCorsHeaders(response);
  return response;
};

const loggedOutRatelimit = new Ratelimit({
  limiter: Ratelimit.slidingWindow(15, "30s"),
  redis: Redis.fromEnv()
});

const handleRatelimiter = async ({
  req,
  session
}: {
  req: NextRequest;
  session: Session | null;
}) => {
  const isLoggedIn = Boolean(session?.user.id);

  // We rate limit logged out users
  if (isLoggedIn) {
    return;
  }

  const ip = req.ip ?? "127.0.0.1";

  const { limit, remaining, reset, success } =
    await loggedOutRatelimit.limit(ip);

  if (success) return;

  return new Response(JSON.stringify({ error: "Rate limited" }), {
    status: 429,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString()
    }
  });
};

const handler = async (req: NextRequest) => {
  const session = getSession(
    req.headers.get(RequestHeaders.Authorization) ?? ""
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
            // eslint-disable-next-line no-console
            console.error(`>>> tRPC Error on '${path}'`, error);
          }
        : undefined
  });

  setCorsHeaders(response);

  return response;
};

export { handler as GET, handler as POST };
