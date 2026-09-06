import { timingSafeEqual } from "node:crypto";

import { getSession } from "./auth-token";
import { config } from "./config";

const WEBHOOK_USER_ID = "WEBHOOK";

/**
 * Compare two secrets without leaking their common prefix through timing.
 * `timingSafeEqual` throws on mismatched lengths, so the length check happens
 * first and is itself the only thing an attacker learns.
 */
const secretsMatch = (candidate: string, secret: string) => {
  const candidateBytes = Buffer.from(candidate);
  const secretBytes = Buffer.from(secret);

  if (candidateBytes.length !== secretBytes.length) return false;

  return timingSafeEqual(candidateBytes, secretBytes);
};

/**
 * Why a webhook delivery was refused, or `null` when it was accepted.
 *
 * Named rather than boolean because the two failures need different actions.
 * `missing` is a delivery that arrived with no credential, which points at the
 * dashboard. `rejected` is one that arrived with a credential we do not
 * recognise, which points at a value that no longer matches, and until this
 * file existed that was the same silent 401 as everything else.
 */
export type RevenueCatAuthFailure = "missing" | "rejected";

/**
 * Is this request a genuine RevenueCat webhook delivery?
 *
 * RevenueCat sends whatever is pasted into the "Authorization header value"
 * box on every delivery, unchanged, forever. That is the whole reason this is
 * a shared secret rather than a signed token: the previous check ran the value
 * through {@link getSession}, which verifies a JWT with a thirty day maximum
 * age. A token pasted into the dashboard therefore worked for a month and then
 * started failing on its own, with no deploy and no error, because nothing
 * refreshes a value that lives in somebody else's dashboard. Every delivery
 * after that is a 401 nobody sees.
 *
 * The legacy path is still accepted so a token that has not aged out yet keeps
 * working through the deploy. `REVENUECAT_WEBHOOK_SECRET` is the one that does
 * not expire. While it is unset the legacy check is the only way in, so an
 * unset secret narrows the door rather than opening it: nothing is accepted
 * that was not already accepted before, which matters because the route behind
 * this changes what people are paying for.
 */
export const authorizeRevenueCatRequest = (
  authorizationHeader: string | null | undefined,
): RevenueCatAuthFailure | null => {
  if (!authorizationHeader) return "missing";

  const secret = config.REVENUECAT_WEBHOOK_SECRET;

  if (secret && authorizationHeader.startsWith("Bearer ")) {
    const candidate = authorizationHeader.slice("Bearer ".length);
    if (secretsMatch(candidate, secret)) return null;
  }

  const session = getSession(authorizationHeader);
  if (session?.user.id === WEBHOOK_USER_ID) return null;

  return "rejected";
};
