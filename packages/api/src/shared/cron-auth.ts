import { timingSafeEqual } from "node:crypto";

import { config } from "./config";

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
 * Is this request a genuine Vercel Cron invocation?
 *
 * Vercel sends `Authorization: Bearer ${CRON_SECRET}` on every scheduled hit
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs), so
 * that header is the whole check. An unset `CRON_SECRET` denies everything
 * rather than falling open, because the route behind this enqueues pushes to
 * real devices.
 *
 * Lives in `@pegada/api` rather than next to the route so it can be tested by
 * the jest suite that already has a runner; the route is a thin wrapper.
 */
export const isAuthorizedCronRequest = (
  authorizationHeader: string | null | undefined,
): boolean => {
  const secret = config.CRON_SECRET;
  if (!secret) return false;

  if (!authorizationHeader?.startsWith("Bearer ")) return false;

  return secretsMatch(authorizationHeader.slice("Bearer ".length), secret);
};
