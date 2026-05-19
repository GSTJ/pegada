import { Alert, Platform } from "react-native";
import Purchases, { CustomerInfo, LOG_LEVEL } from "react-native-purchases";
import * as Device from "expo-device";
import { get } from "lodash";

import { getTrcpContext } from "@/contexts/trcpContext";
import { config } from "@/services/config";
import { sendError } from "@/services/errorTracking";
import { getLoggedUserID } from "@/services/getLoggedUserID";
import { queryClient } from "@/services/queryClient";

export enum PaymentCacheKey {
  CustomerInfo = "PAYMENT_CUSTOMER_INFO_KEY",
  CustomerLogin = "PAYMENT_CUSTOMER_LOGIN_KEY",
  Offerings = "PAYMENT_OFFERINGS_KEY",
}

const revenueCatApiKey = Platform.select({
  ios: config.REVENUE_CAT_IOS_API_KEY,
  macos: config.REVENUE_CAT_IOS_API_KEY,
  android: config.REVENUE_CAT_ANDROID_API_KEY,
  default: "", // This is not used, but it's needed to make TypeScript happy
});

/**
 * Some build environments (CI, local sims, preview builds) ship with placeholder
 * RevenueCat keys (e.g. "ci-stub", "placeholder_revenuecat", empty). RevenueCat
 * throws on every call when the key is invalid, which would crash the app to
 * the global ErrorBoundary if a useSuspenseQuery hook propagated the error.
 * Detect those keys up-front so the payments service can degrade gracefully
 * without making real network calls. Real RevenueCat iOS keys start with
 * "appl_" and Android keys start with "goog_".
 */
const isStubRevenueCatKey =
  !revenueCatApiKey ||
  revenueCatApiKey === "ci-stub" ||
  revenueCatApiKey.startsWith("ci-stub") ||
  revenueCatApiKey.startsWith("placeholder") ||
  (!revenueCatApiKey.startsWith("appl_") && !revenueCatApiKey.startsWith("goog_"));

const init = () => {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE).catch(sendError);
  }

  if (isStubRevenueCatKey) {
    // Skip configure with a known-bad key. Every subsequent call would otherwise
    // throw "Invalid API Key" and propagate through the suspense boundary.
    return;
  }

  try {
    Purchases.configure({ apiKey: revenueCatApiKey });
  } catch (error) {
    sendError(error);
  }
};

const logIn = async () => {
  const userID = await getLoggedUserID();

  if (!userID) {
    throw new Error("Make sure the login is only called when the user is authenticated");
  }

  if (isStubRevenueCatKey) {
    return null;
  }

  try {
    const userData = await Purchases.logIn(userID);

    queryClient.setQueryData([PaymentCacheKey.CustomerInfo], () => userData.customerInfo);

    // Asynchronously set the email and display name
    getTrcpContext()
      .myDog.get.fetch()
      .then(async (response) => {
        await Purchases.setEmail(response?.user.email ?? "");
        await Purchases.setDisplayName(response?.name ?? "");
      })
      .catch(sendError);

    return userData;
  } catch (error) {
    // RevenueCat login can fail in CI/preview builds with placeholder API keys,
    // or for transient backend issues. Swallow the error so the rest of the app
    // (swipe, messages, profile) stays usable. Premium features will be unavailable.
    sendError(error);
    return null;
  }
};

const getOfferings = async () => {
  if (isStubRevenueCatKey) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      return null;
    }

    return offerings.current;
  } catch (error) {
    sendError(error);
    return null;
  }
};

const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (isStubRevenueCatKey) {
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    sendError(error);
    return null;
  }
};

export enum ProductIdentifier {
  Monthly = "premium_monthly",
  Yearly = "premium_yearly",
}

export enum Entitlement {
  Premium = "premium",
}

export enum UserPlan {
  Free = "FREE",
  Premium = "PREMIUM",
}

const purchasePackage = async (...props: Parameters<typeof Purchases.purchasePackage>) => {
  const isSimulator = Platform.OS === "ios" && !Device.isDevice;

  if (isSimulator) {
    Alert.alert(
      "Simulator Detected",
      "Purchases are not available in the IOS simulator. Please try on a real device.",
    );
    throw new Error(
      "Purchases are not available in the IOS simulator. Please try on a real device.",
    );
  }

  try {
    const result = await Purchases.purchasePackage(...props);
    return result;
  } catch (e) {
    // On Android, this happens when a transfer is needed (the user already purchased on another account)
    if (get(e, "message") === "This product is already active for the user.") {
      return restorePurchases();
    }

    throw e;
  }
};

const getPlanByEntitlement = (entitlement: Entitlement) => {
  switch (entitlement) {
    case Entitlement.Premium:
      return UserPlan.Premium;
    default:
      return UserPlan.Free;
  }
};

const getPlan = (customerInfo?: CustomerInfo | null) => {
  if (!customerInfo) {
    return undefined;
  }

  for (const entitlement of Object.values(Entitlement)) {
    if (typeof customerInfo.entitlements.active[entitlement] !== "undefined") {
      return {
        ...customerInfo.entitlements.active[entitlement],
        userPlan: getPlanByEntitlement(entitlement),
      };
    }
  }

  return {
    expirationDate: undefined,
    userPlan: UserPlan.Free,
  };
};

const restorePurchases = async () => {
  if (Platform.OS === "ios" && !Device.isDevice) {
    Alert.alert(
      "Simulator Detected",
      "Restore is not available in the IOS simulator. Please try on a real device.",
    );
    throw new Error("Restore is not available in the IOS simulator. Please try on a real device.");
  }

  await Purchases.restorePurchases();
};

export const payments = {
  init,
  getOfferings,
  purchasePackage,
  getPlan,
  logIn,
  restorePurchases: restorePurchases,
  logOut: Purchases.logOut,
  getCustomerInfo,
  addCustomerInfoUpdateListener: Purchases.addCustomerInfoUpdateListener,
};
