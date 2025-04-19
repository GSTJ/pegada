import { useEffect } from "react";
import * as React from "react";
import { Alert } from "react-native";
import Constants from "expo-constants";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@pegada/api";
import { RequestHeaders } from "@pegada/shared/types/types";

import { setTrcpContext } from "@/contexts/trcpContext";
import i18n from "@/i18n";
import { config } from "@/services/config";
import { logout } from "@/services/logout";
import { queryClient } from "@/services/queryClient";
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

export const trpcQueryClient = api.createClient({
  links: [
    httpBatchLink({
      url: config.API_URL + "/trpc",
      transformer: superjson,
      headers: async () => {
        const headers = new Map<RequestHeaders, string>();

        const token = await getData(StorageKeys.Token);
        const appVersion = Constants.expoConfig?.version ?? "0.0.0";

        headers.set(RequestHeaders.XAppVersion, appVersion);
        headers.set(RequestHeaders.XTRPCSource, "expo-react");
        headers.set(RequestHeaders.AcceptLanguage, i18n.language);

        if (token) {
          headers.set(RequestHeaders.Authorization, `Bearer ${token}`);
        }

        return Object.fromEntries(headers);
      },
      fetch: async (url, options): Promise<Response> => {
        const res = await fetch(url as string, options as RequestInit);
        const responsesJSON = (await res.json()) as ResponseJSON[];

        if (res.status === 401) {
          const unauthorized = responsesJSON.some((responseJSON) => {
            const errorMessage = responseJSON?.error?.json?.message;
            return errorMessage === "UNAUTHORIZED";
          });

          if (unauthorized) {
            Alert.alert(
              i18n.t("session.expired"),
              i18n.t("session.expiredMessage")
            );
            throw logout();
          }
        }

        return {
          ...res,
          // Already decoded here
          json: async () => responsesJSON
        };
      }
    })
  ]
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
