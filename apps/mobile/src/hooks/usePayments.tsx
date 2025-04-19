import { useEffect } from "react";
import { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useSuspenseQuery } from "@tanstack/react-query";

import { identifyUser } from "@/services/getInitialRouteName";
import { PaymentCacheKey, payments, UserPlan } from "@/services/payments";
import { queryClient } from "@/services/queryClient";

// This is only called once
const usePaymentsLogin = () => {
  return useSuspenseQuery({
    queryFn: payments.logIn,
    queryKey: [PaymentCacheKey.CustomerLogin],
    retryOnMount: true,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity
  });
};

export const useEligibleForTrial = ({
  offering
}: {
  offering?: PurchasesPackage | null | undefined;
} = {}) => {
  const customerInfo = useCustomerInfo();

  const hasIntroPrice = offering?.product.introPrice;
  const hadPremium = customerInfo.data?.entitlements.all.premium;

  return hasIntroPrice && !hadPremium;
};

export const useCustomerInfo = () => {
  const loginProps = usePaymentsLogin();

  const customerInfoProps = useSuspenseQuery({
    queryFn: payments.getCustomerInfo,
    queryKey: [PaymentCacheKey.CustomerInfo],
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: true
  });

  return {
    ...customerInfoProps,
    isLoading: loginProps.isLoading || customerInfoProps.isLoading,
    error: loginProps.error || customerInfoProps.error
  };
};

export const useCustomerPlan = () => {
  const { data, ...props } = useCustomerInfo();

  const customerPlan = data ? payments.getPlan(data) : undefined;

  useEffect(() => {
    void identifyUser({ extra: { user_plan: customerPlan?.userPlan } });
  }, [customerPlan?.userPlan]);

  return {
    ...props,
    data: customerPlan
  };
};

/**
 * Does not account for errors. Users will fall back to premium if there's an error.
 * Meant to use on specific actions that should only be available to premium users.
 */
export const useUnsafeIsPremium = () => {
  const plan = useCustomerPlan();
  return plan.data?.userPlan !== UserPlan.Free;
};

/**
 * Does not account for errors. Users will fall back to premium if there's an error.
 * Meant to use on specific actions that should only be available to premium users.
 */
export const getUnsafeIsPremium = () => {
  const customerInfoQueryData = queryClient.getQueryData<CustomerInfo>([
    PaymentCacheKey.CustomerInfo
  ]);

  const plan = payments.getPlan(customerInfoQueryData);

  return plan?.userPlan !== UserPlan.Free;
};

export const useOfferings = () => {
  return useSuspenseQuery({
    queryFn: payments.getOfferings,
    queryKey: [PaymentCacheKey.Offerings],
    retryOnMount: true,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
  });
};

// Automatically initialize the payments service
payments.init();

// Automatically update the query data when the customer info changes
payments.addCustomerInfoUpdateListener(async (customerInfo: CustomerInfo) => {
  queryClient.setQueryData([PaymentCacheKey.CustomerInfo], customerInfo);
});
