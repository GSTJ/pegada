import type { NextRequest } from "next/server";

import { ReengagementService } from "@pegada/api/services/reengagement-service";
import { isAuthorizedCronRequest } from "@pegada/api/shared/cron-auth";

/**
 * Each send is a database write plus a queue publish, and the run does them in
 * sequence so the per-user daily cap cannot be raced. At the cap of 200 pushes
 * that is comfortably inside a minute and nowhere near the default budget.
 */
export const maxDuration = 60;

/**
 * Vercel Cron hits this every hour (see `crons` in vercel.json). Hourly is not
 * how often a user is nudged: it is what lets the service honour a per-user
 * local time window, since 18:00 happens at twelve different UTC hours across
 * the timezones the app has users in. The service decides who is actually due.
 */
export const GET = async (request: NextRequest) => {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }

  const summary = await ReengagementService.run();

  return Response.json(summary);
};
