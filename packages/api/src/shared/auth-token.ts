import jwt from "jsonwebtoken";
import { z } from "zod";

import { config } from "./config";

const ACCESS_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const ACCESS_TOKEN_ALGORITHM = "HS256";

export type Session = {
  user: {
    id: string;
  };
};

export const signAccessToken = (payload: { sub: string }) =>
  jwt.sign(payload, config.JWT_SECRET, {
    algorithm: ACCESS_TOKEN_ALGORITHM,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

export const getSession = (bearer: string): Session | null => {
  if (!bearer) return null;

  try {
    const authorization = z
      .string()
      .regex(/^Bearer\s+\S+$/)
      .parse(bearer);
    const safeBearerToken = authorization.slice("Bearer ".length);

    const decoded = jwt.verify(safeBearerToken, config.JWT_SECRET, {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
    });

    if (typeof decoded === "string" || !decoded.sub || !decoded.iat) {
      throw new Error("Invalid token");
    }

    return { user: { id: decoded.sub } };
  } catch {
    return null;
  }
};
