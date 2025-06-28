import { NextRequest } from "next/server";

import PaymentService from "@pegada/api/services/PaymentService";
import { getSession } from "@pegada/api/trpc";
import { RequestHeaders } from "@pegada/shared/types/types";

const WEBHOOK_USER_ID = "WEBHOOK";

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Request-Method": "*",
      "Access-Control-Allow-Methods": "OPTIONS, POST",
      "Access-Control-Allow-Headers": "*"
    }
  });

  return response;
};

export const POST = async (req: NextRequest) => {
  const session = getSession(
    req.headers.get(RequestHeaders.Authorization) ?? ""
  );

  if (session?.user.id !== WEBHOOK_USER_ID) {
    return new Response(null, { status: 401 });
  }

  const paymentService = new PaymentService();

  const reqBody = await req.json();
  await paymentService.handleRevenueCatEvent(reqBody);

  return new Response(null, { status: 200 });
};
