import { PropsWithChildren, Suspense, useEffect, useState } from "react";
import * as React from "react";
import { ActivityIndicator, ViewProps } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import {
  QueryErrorResetBoundary,
  useQueryErrorResetBoundary
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { Button } from "@/components/Button";
import { BugsnagErrorBoundary } from "@/config";
import {
  ContainedText,
  Container,
  Content,
  DisconnectedIllustration,
  ErrorIllustration,
  Title
} from "./styles";

export const OfflineComponent = ({ reset }: { reset: () => void }) => {
  const { t } = useTranslation();

  return (
    <Container>
      <Content>
        <DisconnectedIllustration />
        <Title>{t("networkBoundary.offline.title")}</Title>
        <ContainedText>{t("networkBoundary.offline.message")}</ContainedText>
        <Button onPress={() => reset()}>
          {t("networkBoundary.offline.retry")}
        </Button>
      </Content>
    </Container>
  );
};

export const RequestErrorComponent = ({ reset }: { reset: () => void }) => {
  const { t } = useTranslation();

  return (
    <Container>
      <Content>
        <ErrorIllustration />
        <Title>{t("networkBoundary.requestError.title")}</Title>
        <ContainedText>
          {t("networkBoundary.requestError.message")}
        </ContainedText>
        <Button variant="outline" onPress={() => reset()}>
          {t("networkBoundary.requestError.retry")}
        </Button>
      </Content>
    </Container>
  );
};

export const UnknownErrorComponent = (props: ViewProps) => {
  const { t } = useTranslation();

  return (
    <Container {...props}>
      <Content>
        <ErrorIllustration />
        <Title>{t("networkBoundary.unknownError.title")}</Title>
        <ContainedText>
          {t("networkBoundary.unknownError.message")}
        </ContainedText>
      </Content>
    </Container>
  );
};

// NetInfo is always disconnected on the first render. Workaround hook
export const useIsOffline = () => {
  const [isInternetReachable, setIsInternetReachable] = useState<boolean>(true);
  const { reset } = useQueryErrorResetBoundary();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((info) => {
      if (info.isInternetReachable === null) return;

      if (info.isInternetReachable !== isInternetReachable) {
        reset(); // Retry all failed queries
      }

      setIsInternetReachable(info.isInternetReachable);
    });

    return unsubscribe;
  }, [isInternetReachable, reset]);

  return !isInternetReachable;
};

interface QueryErrorResetBoundaryValue {
  clearReset: () => void;
  isReset: () => boolean;
  reset: () => void;
}

export type IErrorBoundary = (
  props: QueryErrorResetBoundaryValue
) => React.ReactNode;

export const DefaultErrorComponent: IErrorBoundary = ({ reset, isReset }) => {
  const offline = useIsOffline();

  if (offline) return <OfflineComponent reset={reset} />;

  const wasReset = isReset();
  if (!wasReset) return <RequestErrorComponent reset={reset} />;

  return <UnknownErrorComponent />;
};

export const DefaultLoadingComponent = () => {
  const theme = useTheme();
  return (
    <Content>
      <ActivityIndicator color={theme.colors.text} />
    </Content>
  );
};

type NetworkBoundaryProps = {
  children: React.ReactNode;
  suspenseFallback?: React.ReactNode;
  errorFallback?: IErrorBoundary;
};

const QueryAwareErrorBoundary = ({
  children,
  errorFallback
}: PropsWithChildren<Pick<NetworkBoundaryProps, "errorFallback">>) => {
  const handleError = (props: QueryErrorResetBoundaryValue) => {
    const ErrorComponent = errorFallback ?? DefaultErrorComponent;

    return (
      <BugsnagErrorBoundary
        FallbackComponent={() => <ErrorComponent {...props} />}
      >
        {children}
      </BugsnagErrorBoundary>
    );
  };

  return <QueryErrorResetBoundary>{handleError}</QueryErrorResetBoundary>;
};

export const NetworkBoundary = ({
  children,
  suspenseFallback,
  errorFallback
}: NetworkBoundaryProps) => {
  return (
    <QueryAwareErrorBoundary errorFallback={errorFallback}>
      <Suspense fallback={suspenseFallback ?? <DefaultLoadingComponent />}>
        {children}
      </Suspense>
    </QueryAwareErrorBoundary>
  );
};
