import jwt from "jsonwebtoken";

import { getSession, signAccessToken } from "./auth-token";
import { config } from "./config";

const userId = "security-test-user";

describe("access tokens", () => {
  it("accepts a fresh token from the API signer", () => {
    const token = signAccessToken({ sub: userId });

    expect(getSession(`Bearer ${token}`)).toEqual({ user: { id: userId } });
  });

  it("rejects tokens older than 30 days", () => {
    const token = jwt.sign(
      {
        sub: userId,
        iat: Math.floor(Date.now() / 1000) - 31 * 24 * 60 * 60,
      },
      config.JWT_SECRET,
      { algorithm: "HS256", expiresIn: "1000d" },
    );

    expect(getSession(`Bearer ${token}`)).toBeNull();
  });

  it("rejects another HMAC algorithm and a non-Bearer scheme", () => {
    const token = jwt.sign({ sub: userId }, config.JWT_SECRET, {
      algorithm: "HS384",
      expiresIn: "1h",
    });

    expect(getSession(`Bearer ${token}`)).toBeNull();
    expect(getSession(`Token ${token}`)).toBeNull();
  });
});
