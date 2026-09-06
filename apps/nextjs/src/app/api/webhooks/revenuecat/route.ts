import type { NextRequest } from "next/server";

import PaymentService from "@pegada/api/services/payment-service";
import { captureEvent } from "@pegada/api/shared/analytics";
import { authorizeRevenueCatRequest } from "@pegada/api/shared/revenuecat-auth";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { RequestHeaders } from "@pegada/shared/types/types";

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Request-Method": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST",
      "Access-Control-Allow-Headers": "*",
    },
  });

  return response;
};

export const POST = async (req: NextRequest) => {
  const failure = authorizeRevenueCatRequest(
    req.headers.get(RequestHeaders.Authorization),
  );

  if (failure) {
    // The refusal is the reading. An empty subscriptions table can mean the
    // webhook was never set up or that every delivery is being turned away at
    // the door, and those are different problems with different fixes. There
    // is no user to attribute this to, so it is captured against the route.
    captureEvent(
      "revenuecat-webhook",
      ANALYTICS_EVENTS.SUBSCRIPTION_WEBHOOK_REJECTED,
      { reason: failure },
    );

    return new Response(null, { status: 401 });
  }

  const paymentService = new PaymentService();

  const reqBody = await req.json();
  await paymentService.handleRevenueCatEvent(reqBody);

  return new Response(null, { status: 200 });
};
