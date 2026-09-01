import type { NextRequest } from "next/server";

import { ReengagementService } from "@pegada/api/services/reengagement-service";
import { isAuthorizedCronRequest } from "@pegada/api/shared/cron-auth";

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
