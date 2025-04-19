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
  Offerings = "PAYMENT_OFFERINGS_KEY"
}

const revenueCatApiKey = Platform.select({
  ios: config.REVENUE_CAT_IOS_API_KEY,
  macos: config.REVENUE_CAT_IOS_API_KEY,
  android: config.REVENUE_CAT_ANDROID_API_KEY,
  default: "" // This is not used, but it's needed to make TypeScript happy
});

const init = () => {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE).catch(sendError);
  }

  Purchases.configure({ apiKey: revenueCatApiKey });
};

const logIn = async () => {
  const userID = await getLoggedUserID();

  if (!userID) {
    throw new Error(
      "Make sure the login is only called when the user is authenticated"
    );
  }

  const userData = await Purchases.logIn(userID);

  queryClient.setQueryData(
    [PaymentCacheKey.CustomerInfo],
    () => userData.customerInfo
  );

  // Asynchronously set the email and display name
  getTrcpContext()
    .myDog.get.fetch()
    .then(async (response) => {
      await Purchases.setEmail(response?.user.email ?? "");
      await Purchases.setDisplayName(response?.name ?? "");
    })
    .catch(sendError);

  return userData;
};

const getOfferings = async () => {
  const offerings = await Purchases.getOfferings();

  if (!offerings.current) {
    throw new Error("No offerings available");
  }

  return offerings.current;
};

export enum ProductIdentifier {
  Monthly = "premium_monthly",
  Yearly = "premium_yearly"
}

export enum Entitlement {
  Premium = "premium"
}

export enum UserPlan {
  Free = "FREE",
  Premium = "PREMIUM"
}

const purchasePackage = async (
  ...props: Parameters<typeof Purchases.purchasePackage>
) => {
  const isSimulator = Platform.OS === "ios" && !Device.isDevice;

  if (isSimulator) {
    Alert.alert(
      "Simulator Detected",
      "Purchases are not available in the IOS simulator. Please try on a real device."
    );
    throw new Error(
      "Purchases are not available in the IOS simulator. Please try on a real device."
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

const getPlan = (customerInfo?: CustomerInfo) => {
  if (!customerInfo) {
    return undefined;
  }

  for (const entitlement of Object.values(Entitlement)) {
    if (typeof customerInfo.entitlements.active[entitlement] !== "undefined") {
      return {
        ...customerInfo.entitlements.active[entitlement],
        userPlan: getPlanByEntitlement(entitlement)
      };
    }
  }

  return {
    expirationDate: undefined,
    userPlan: UserPlan.Free
  };
};

const restorePurchases = async () => {
  if (Platform.OS === "ios" && !Device.isDevice) {
    Alert.alert(
      "Simulator Detected",
      "Restore is not available in the IOS simulator. Please try on a real device."
    );
    throw new Error(
      "Restore is not available in the IOS simulator. Please try on a real device."
    );
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
  getCustomerInfo: Purchases.getCustomerInfo,
  addCustomerInfoUpdateListener: Purchases.addCustomerInfoUpdateListener
};
