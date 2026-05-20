import { Alert, Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
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

/**
 * Synthesizes a `PurchasesOffering` shape sufficient for the upgrade-wall UI
 * (PlanPackages + PlanCard + useEligibleForTrial). Only the fields the React
 * tree actually reads are populated — anything else stays undefined and is
 * cast through `unknown` because the full RC type has ~40 fields most of
 * which the mobile never touches.
 *
 * Used in two scenarios:
 *   1. Maestro E2E flow 25-upgrade-journey — the simulator has no StoreKit
 *      account configured, so a real `Purchases.getOfferings()` resolves
 *      with `current: null` and the UI renders empty space + a loading CTA.
 *      The validator caught exactly that ("plan rows show loading dots").
 *   2. Local development on the iOS simulator when no StoreKit configuration
 *      file is wired into the active Xcode scheme. Same failure mode.
 *
 * Production builds (real RC key, MAESTRO_E2E unset) never reach this code
 * path — `isStubRevenueCatKey` is false and `Purchases.getOfferings()`
 * returns real App Store / Play Store pricing.
 */
const buildMaestroSyntheticOfferings = (): PurchasesOffering => {
  const monthlyPrice = 9.99;
  const yearlyPrice = 49.99;

  const baseProduct = {
    description: "Pegada Premium",
    title: "Pegada Premium",
    currencyCode: "USD",
    introPrice: null,
    discounts: null,
    productCategory: "SUBSCRIPTION",
    productType: "AUTO_RENEWABLE_SUBSCRIPTION",
    subscriptionPeriod: "P1M",
    defaultOption: null,
    subscriptionOptions: null,
    presentedOfferingIdentifier: "default",
  };

  // String literals (not ProductIdentifier.*) because the enum is declared
  // further down in this file — both values match the enum exactly.
  const monthlyProduct = {
    ...baseProduct,
    identifier: "premium_monthly",
    price: monthlyPrice,
    priceString: `$${monthlyPrice.toFixed(2)}`,
    pricePerWeek: monthlyPrice / 4,
    pricePerMonth: monthlyPrice,
    pricePerYear: monthlyPrice * 12,
    pricePerWeekString: `$${(monthlyPrice / 4).toFixed(2)}`,
    pricePerMonthString: `$${monthlyPrice.toFixed(2)}`,
    pricePerYearString: `$${(monthlyPrice * 12).toFixed(2)}`,
    subscriptionPeriod: "P1M",
  };

  const yearlyProduct = {
    ...baseProduct,
    identifier: "premium_yearly",
    price: yearlyPrice,
    priceString: `$${yearlyPrice.toFixed(2)}`,
    pricePerWeek: yearlyPrice / 52,
    pricePerMonth: yearlyPrice / 12,
    pricePerYear: yearlyPrice,
    pricePerWeekString: `$${(yearlyPrice / 52).toFixed(2)}`,
    pricePerMonthString: `$${(yearlyPrice / 12).toFixed(2)}`,
    pricePerYearString: `$${yearlyPrice.toFixed(2)}`,
    subscriptionPeriod: "P1Y",
  };

  const monthlyPackage = {
    identifier: "$rc_monthly",
    packageType: "MONTHLY",
    product: monthlyProduct,
    offeringIdentifier: "default",
    presentedOfferingContext: { offeringIdentifier: "default" },
  };

  const yearlyPackage = {
    identifier: "$rc_annual",
    packageType: "ANNUAL",
    product: yearlyProduct,
    offeringIdentifier: "default",
    presentedOfferingContext: { offeringIdentifier: "default" },
  };

  return {
    identifier: "default",
    serverDescription: "Pegada Premium (Maestro/Sim fallback)",
    metadata: {},
    availablePackages: [monthlyPackage, yearlyPackage],
    lifetime: null,
    annual: yearlyPackage,
    sixMonth: null,
    threeMonth: null,
    twoMonth: null,
    monthly: monthlyPackage,
    weekly: null,
  } as unknown as PurchasesOffering;
};

const isIosSimulator = Platform.OS === "ios" && !Device.isDevice;

const getOfferings = async () => {
  // Maestro/sim fallback path. See `buildMaestroSyntheticOfferings` for the
  // full rationale — both Maestro CI and local sim development would
  // otherwise render the upgrade wall with empty plan rows + a perpetually
  // loading CTA, because StoreKit cannot resolve real pricing without an
  // attached `.storekit` configuration in the Xcode scheme.
  if (isStubRevenueCatKey) {
    return buildMaestroSyntheticOfferings();
  }

  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      // Same fallback for real RC keys when running on an iOS simulator
      // without a StoreKit configuration file attached. Returning null
      // here would freeze the upgrade wall on a loading state with no
      // user-visible explanation. The synthetic offering at least lets
      // the screen render so a developer can verify layout and copy.
      if (isIosSimulator) {
        return buildMaestroSyntheticOfferings();
      }
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
    // Maestro-mock-only: once the test has granted premium, every subsequent
    // getCustomerInfo (e.g. on window-focus refetch) must keep returning the
    // synthetic payload, or React Query will overwrite the premium state
    // with null and the UI will flip back to "Free" while still on screen.
    if (maestroSyntheticCustomerInfo) {
      return maestroSyntheticCustomerInfo;
    }
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

/**
 * Maestro-only path. RevenueCat's native purchase sheet cannot be driven
 * from an iOS simulator in CI, so under BOTH gates
 * (`EXPO_PUBLIC_MAESTRO_E2E === "1"` AND `isStubRevenueCatKey`) we route
 * the purchase tap to a dev-only tRPC mutation that updates the user's
 * plan on the backend, then synthesize a `CustomerInfo`-shaped payload
 * and push it into the queryClient. This triggers the same React state
 * transitions a real RC `addCustomerInfoUpdateListener` callback would,
 * giving Maestro a deterministic way to assert the post-purchase UI.
 *
 * This branch is impossible to hit on a production build:
 *   - The Maestro env var is never set in non-CI builds.
 *   - The stub-key guard already short-circuits when RC has a real key.
 *   - The backend endpoint itself is gated by NODE_ENV !== "production"
 *     AND MAESTRO_E2E=1 (see packages/api/src/routes/payment.ts).
 */
const isMaestroMockMode = config.MAESTRO_E2E === "1" && isStubRevenueCatKey;

// Holds the synthetic CustomerInfo created by a successful mock purchase
// so subsequent refetches (window-focus) keep returning premium instead of
// dropping back to `null`. Module-level — lives for the lifetime of the
// process, which matches a Maestro flow's single-launch lifecycle.
let maestroSyntheticCustomerInfo: CustomerInfo | null = null;

const maestroMockPurchase = async (pkg: PurchasesPackage) => {
  const trpc = getTrcpContext();
  if (!trpc) {
    throw new Error("tRPC context unavailable for Maestro mock purchase");
  }

  await trpc.client.payment.maestroGrantPremium.mutate();

  // Synthesize the minimum shape consumers (useCustomerPlan, getPlan,
  // useEligibleForTrial, the upgrade-wall analytics) read from
  // CustomerInfo. The full RC type has ~30 fields; only entitlements is
  // load-bearing for the UI under test.
  const now = new Date();
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const premiumEntitlement = {
    identifier: Entitlement.Premium,
    isActive: true,
    willRenew: true,
    periodType: "NORMAL",
    latestPurchaseDate: now.toISOString(),
    latestPurchaseDateMillis: now.getTime(),
    originalPurchaseDate: now.toISOString(),
    originalPurchaseDateMillis: now.getTime(),
    expirationDate: farFuture.toISOString(),
    expirationDateMillis: farFuture.getTime(),
    store: "APP_STORE",
    productIdentifier: pkg.product.identifier,
    productPlanIdentifier: pkg.product.identifier,
    isSandbox: true,
    unsubscribeDetectedAt: null,
    billingIssueDetectedAt: null,
    ownershipType: "PURCHASED",
    verification: "NOT_REQUESTED",
  };

  const synthetic = {
    entitlements: {
      all: { [Entitlement.Premium]: premiumEntitlement },
      active: { [Entitlement.Premium]: premiumEntitlement },
      verification: "NOT_REQUESTED",
    },
    activeSubscriptions: [pkg.product.identifier],
    allPurchasedProductIdentifiers: [pkg.product.identifier],
    nonSubscriptionTransactions: [],
    latestExpirationDate: farFuture.toISOString(),
    firstSeen: now.toISOString(),
    originalAppUserId: (await getLoggedUserID()) ?? "maestro",
    requestDate: now.toISOString(),
    allExpirationDates: { [pkg.product.identifier]: farFuture.toISOString() },
    allPurchaseDates: { [pkg.product.identifier]: now.toISOString() },
    originalApplicationVersion: null,
    originalPurchaseDate: now.toISOString(),
    managementURL: null,
  } as unknown as CustomerInfo;

  maestroSyntheticCustomerInfo = synthetic;
  queryClient.setQueryData([PaymentCacheKey.CustomerInfo], synthetic);

  // Return a shape compatible with Purchases.purchasePackage's resolved
  // value so the UpgradeWall mutation's onSuccess handler is happy.
  return {
    productIdentifier: pkg.product.identifier,
    customerInfo: synthetic,
    transaction: null,
  };
};

const purchasePackage = async (...props: Parameters<typeof Purchases.purchasePackage>) => {
  if (isMaestroMockMode) {
    const [pkg] = props;
    return maestroMockPurchase(pkg) as unknown as ReturnType<typeof Purchases.purchasePackage>;
  }

  if (isIosSimulator) {
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
  if (isIosSimulator) {
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
