/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import type { NextRequest } from "next/server";
import { initTRPC, TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import superjson from "superjson";
import { z, ZodError } from "zod";

import { prisma } from "@pegada/database";
import { IntentionalError } from "@pegada/shared/errors/errors";
import { Language } from "@pegada/shared/i18n/types/types";
import { RequestHeaders } from "@pegada/shared/types/types";

import { logDebug, sendError } from "./errors/errors";
import { config } from "./shared/config";

// That was added by me manually
export interface Session {
  user: {
    id: string;
  };
}

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API
 *
 * These allow you to access things like the database, the session, etc, when
 * processing a request
 *
 */
interface CreateContextOptions {
  session: Session | null;
  language?: Language;
  req?: NextRequest;
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use
 * it, you can export it from here
 *
 * Examples of things you may need it for:
 * - testing, so we dont have to mock Next.js' req/res
 * - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    req: opts.req,
    session: opts.session,
    language: opts.language ?? Language.Default,
    db: prisma,
    jwtSign: (payload: { sub: string }) => {
      return jwt.sign(payload, config.JWT_SECRET, {
        expiresIn: "1000d" // TODO: Use refresh tokens
      });
    }
  };
};

export const getSession = (bearer: string) => {
  if (!bearer) return null;

  try {
    const unsafeBearerToken = bearer.split(" ")[1];
    const safeBearerToken = z.string().parse(unsafeBearerToken);

    const decoded = jwt.verify(safeBearerToken, config.JWT_SECRET) as {
      id?: string;
      sub?: string;
    };

    if (!decoded.sub) {
      throw new Error("Invalid token");
    }

    const session = {
      user: {
        id: decoded.sub
      }
    };

    return session;
  } catch {
    return null;
  }
};

/**
 * This is the actual context you'll use in your router. It will be used to
 * process every request that goes through your tRPC endpoint
 * @link https://trpc.io/docs/context
 */
export const createTRPCContext = (opts: {
  req: NextRequest;
  session: Session | null;
}) => {
  const source = opts.req.headers.get(RequestHeaders.XTRPCSource) ?? "unknown";

  logDebug(">>> tRPC Request from", source, "by", opts.session?.user);

  return createInnerTRPCContext({
    session: opts.session,
    req: opts.req,
    language: opts.req.headers.get(RequestHeaders.AcceptLanguage) as Language
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => {
    // Those errors are handled and intentionally thrown

    const intentionalError = error instanceof IntentionalError;

    if (intentionalError) {
      return {
        ...shape,
        data: { error: { ...error } }
      };
    }

    sendError(error);

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null
      }
    };
  }
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure;

/**
 * Reusable middleware that enforces users are logged in before running the
 * procedure
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user }
    }
  });
});

/**
 * Protected (authed) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use
 * this. It verifies the session is valid and guarantees ctx.session.user is not
 * null
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
