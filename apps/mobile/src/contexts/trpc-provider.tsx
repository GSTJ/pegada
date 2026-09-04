import type { AppRouter } from "@pegada/api";

import { useEffect } from "react";
import * as React from "react";
import { Alert, Platform } from "react-native";

import Constants from "expo-constants";

import { RequestHeaders } from "@pegada/shared/types/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import { setTrcpContext } from "@/contexts/trcp-context";
import i18n from "@/i18n";
import { config } from "@/services/config";
import { logout } from "@/services/logout";
import { queryClient } from "@/services/query-client";
import { getData, StorageKeys } from "@/services/storage";

export { type RouterInputs, type RouterOutputs } from "@pegada/api";

/**
 * A set of typesafe hooks for consuming your API.
 */
export const api = createTRPCReact<AppRouter>();

type ResponseJSON = {
  error?: {
    json?: {
      message?: string;
    };
  };
};

/**
 * Ceiling on a single HTTP attempt.
 *
 * There was no timeout at all before this: a connection that opened and then
 * stalled left the mutation `isPending` forever, with no error, no toast and
 * no way out but killing the app. The value has to clear a genuinely cold
 * path — a Vercel function that has to boot, a Prisma engine that has to
 * initialise, and a database that may have to wake from autosuspend — which
 * is seconds, not hundreds of milliseconds. Retries are layered on top (see
 * services/transient-retry.ts), so this is per attempt, not per user action.
 */
export const REQUEST_TIMEOUT_MS = 15_000;

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // tRPC passes its own signal for query cancellation; honour both.
  options.signal?.addEventListener("abort", () => controller.abort());

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const trpcQueryClient = api.createClient({
  links: [
    httpBatchLink({
      url: `${config.API_URL}/trpc`,
      transformer: superjson,
      headers: async () => {
        const headers = new Map<RequestHeaders, string>();

        const token = await getData(StorageKeys.Token);
        const appVersion = Constants.expoConfig?.version ?? "0.0.0";

        headers.set(RequestHeaders.XAppVersion, appVersion);
        // Which store this build came from, so the update floor can be raised
        // on the platform a release is already live on without locking out the
        // one still waiting on review.
        headers.set(RequestHeaders.XAppPlatform, Platform.OS);
        headers.set(RequestHeaders.XTRPCSource, "expo-react");
        headers.set(RequestHeaders.AcceptLanguage, i18n.language);

        if (token) {
          headers.set(RequestHeaders.Authorization, `Bearer ${token}`);
        }

        return Object.fromEntries(headers);
      },
      fetch: async (url, options): Promise<Response> => {
        const res = await fetchWithTimeout(
          url as string,
          options as RequestInit,
        );

        // The API base URL must resolve directly to the tRPC handler with NO
        // redirect. `pegada.app` 308-redirects to `www.pegada.app`, and RN's
        // fetch surfaces the redirect body ("Redirecting...") instead of
        // following it transparently — so `res.json()` below would throw on
        // the very first request and take startup down with it. If the body
        // isn't JSON (redirect page, HTML 5xx, gateway timeout), degrade to an
        // empty tRPC batch instead of throwing so the app can recover.
        let responsesJSON: ResponseJSON[];
        try {
          responsesJSON = (await res.json()) as ResponseJSON[];
        } catch {
          responsesJSON = [];
        }

        if (res.status === 401) {
          const unauthorized = responsesJSON.some((responseJSON) => {
            const errorMessage = responseJSON?.error?.json?.message;
            return errorMessage === "UNAUTHORIZED";
          });

          if (unauthorized) {
            Alert.alert(
              i18n.t("session.expired"),
              i18n.t("session.expiredMessage"),
            );
            throw logout();
          }
        }

        // Rebuilt rather than spread: `status`, `ok` and `headers` live on
        // Response.prototype, so `{ ...res }` copied none of them and every
        // response reached the link as an object whose status was
        // `undefined`. The retry policy in services/transient-retry.ts needs
        // a real status to tell a 5xx worth retrying from a 4xx that is final.
        const body = JSON.stringify(responsesJSON);

        return new Response(body, {
          status: res.status,
          statusText: res.statusText,
          headers: { "content-type": "application/json" },
        });
      },
    }),
  ],
});

const ImperativeTRPCProvider = (props: { children: React.ReactNode }) => {
  const context = api.useUtils();

  useEffect(() => {
    setTrcpContext(context);
  }, [context]);

  return props.children;
};

/**
 * A wrapper for your app that provides the TRPC context.
 * Use only in _app.tsx
 */
export const TRPCProvider = (props: { children: React.ReactNode }) => {
  return (
    <api.Provider client={trpcQueryClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ImperativeTRPCProvider>{props.children}</ImperativeTRPCProvider>
      </QueryClientProvider>
    </api.Provider>
  );
};
