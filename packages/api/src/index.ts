import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import { appRouter, type AppRouter } from "./root";
import { createCallerFactory } from "./trpc";

export { appRouter } from "./root";
export { createTRPCContext } from "./trpc";
export type { AppRouter } from "./root";

/**
 * Create a server-side caller for the tRPC API
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
const createCaller = createCallerFactory(appRouter);

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 **/
type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 **/
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { createCaller };
export type { RouterInputs, RouterOutputs };
