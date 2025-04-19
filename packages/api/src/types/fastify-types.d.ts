import "fastify";
import "@fastify/jwt";

declare module "@fastify/jwt" {
  export interface FastifyJWT {
    user:
      | {
          id: string;
        }
      | undefined;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user:
      | {
          id: string;
        }
      | undefined;
  }
}
