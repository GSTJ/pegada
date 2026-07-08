import { ExpoConfig } from "expo/config";

// The primary/fallback locale's native strings (permission descriptions,
// etc.), also used verbatim by the `locales` map below. Reused here to
// seed Android's base values/strings.xml via withDefaultLocaleStrings,
// see that plugin's file for why this is needed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultLocaleNativeStrings = require("@pegada/shared/i18n/locales/en/native.json");

const config: ExpoConfig = {
  /**
   * Always update the version when making a native change
   * That affects eas updates and makes sure the app doesn't
   * break when updating Over The Air
   */
  version: "1.5.0",
  runtimeVersion: {
    policy: "appVersion",
  },
  name: "Pegada",
  scheme: "pegada",
  slug: "pegada",
  icon: "./src/assets/images/icon.png",
  orientation: "portrait",
  platforms: ["ios", "android"],
  primaryColor: "#EE61A1",
  updates: {
    url: "https://u.expo.dev/cadfd124-f01c-4d16-910e-1455f62a3b03",
    fallbackToCacheTimeout: 10000,
  },

  experiments: {
    reactCompiler: true,
    typedRoutes: true,
    tsconfigPaths: true,
  },
  plugins: [
    "expo-secure-store",
    "expo-notifications",
    "expo-localization",
    "expo-router",
    // react-native-maps 1.20+ enables Google Maps via its own config plugin.
    // The deprecated `ios.config.googleMapsApiKey` / `android.config.googleMaps`
    // fields make Expo prebuild reference a `react-native-google-maps` podspec
    // that no longer exists in 1.27, which breaks `pod install` on iOS.
    [
      "react-native-maps",
      {
        iosGoogleMapsApiKey: process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY,
        androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY,
      },
    ],
    [
      "expo-build-properties",
      {
        ios: {
          // https://docs.page/invertase/react-native-google-mobile-ads#optionally-configure-ios-static-frameworks
          useFrameworks: "static",
        },
        android: {
          // https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent#handling-consent
          extraProguardRules: "-keep class com.google.android.gms.internal.consent_sdk.** { *; }",
        },
      },
    ],
    [
      "expo-tracking-transparency",
      {
        userTrackingPermission:
          "The app tracks anonymous data to improve user experience, we respect your privacy.",
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          // Expo does not support importing from non-relative paths here yet
          "./../../packages/shared/themes/fonts/Gilroy-Bold.ttf",
          "./../../packages/shared/themes/fonts/Gilroy-ExtraBold.ttf",
          "./../../packages/shared/themes/fonts/Gilroy-Light.ttf",
          "./../../packages/shared/themes/fonts/Gilroy-Medium.ttf",
          "./../../packages/shared/themes/fonts/Gilroy-Regular.ttf",
          "./../../packages/shared/themes/fonts/Gilroy-SemiBold.ttf",
        ],
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-6276873083446538~7961105320",
        iosAppId: "ca-app-pub-6276873083446538~9769011019",
        skAdNetworkItems: [
          "cstr6suwn9.skadnetwork",
          "4fzdc2evr5.skadnetwork",
          "4pfyvq9l8r.skadnetwork",
          "2fnua5tdw4.skadnetwork",
          "ydx93a7ass.skadnetwork",
          "5a6flpkh64.skadnetwork",
          "p78axxw29g.skadnetwork",
          "v72qych5uu.skadnetwork",
          "ludvb6z3bs.skadnetwork",
          "cp8zw746q7.skadnetwork",
          "c6k4g5qg8m.skadnetwork",
          "s39g8k73mm.skadnetwork",
          "3qy4746246.skadnetwork",
          "3sh42y64q3.skadnetwork",
          "f38h382jlk.skadnetwork",
          "hs6bdukanm.skadnetwork",
          "v4nxqhlyqp.skadnetwork",
          "wzmmz9fp6w.skadnetwork",
          "yclnxrl5pm.skadnetwork",
          "t38b2kh725.skadnetwork",
          "7ug5zh24hu.skadnetwork",
          "9rd848q2bz.skadnetwork",
          "y5ghdn5j9k.skadnetwork",
          "n6fk4nfna4.skadnetwork",
          "v9wttpbfk9.skadnetwork",
          "n38lu8286q.skadnetwork",
          "47vhws6wlr.skadnetwork",
          "kbd757ywx3.skadnetwork",
          "9t245vhmpl.skadnetwork",
          "a2p9lx4jpn.skadnetwork",
          "22mmun2rn5.skadnetwork",
          "4468km3ulz.skadnetwork",
          "2u9pt9hc89.skadnetwork",
          "8s468mfl3y.skadnetwork",
          "av6w8kgt66.skadnetwork",
          "klf5c3l5u5.skadnetwork",
          "ppxm28t8ap.skadnetwork",
          "424m5254lk.skadnetwork",
          "ecpz2srf59.skadnetwork",
          "uw77j35x4d.skadnetwork",
          "mlmmfzh3r3.skadnetwork",
          "578prtvx9j.skadnetwork",
          "4dzt52r2t5.skadnetwork",
          "gta9lk7p23.skadnetwork",
          "e5fvkxwrpn.skadnetwork",
          "8c4e2ghe7u.skadnetwork",
          "zq492l623r.skadnetwork",
          "3rd42ekr43.skadnetwork",
          "3qcr597p9d.skadnetwork",
        ],
      },
    ],
    [
      "expo-updates",
      {
        username: "gstj",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission: "The app uses your location to find doggies near you.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "The app allows you to choose photos for your doggie's profile.",
        cameraPermission: "The app allows you to take photos for your doggie's profile.",
      },
    ],
    // Wires the source-controlled `Pegada.storekit` fixture into the iOS
    // scheme so simulator runs (local + CI) can resolve real product pricing
    // without an App Store sandbox session. Plugin is a no-op when the file
    // is missing or when the platform isn't iOS.
    "./plugins/withStoreKitConfiguration",
    // Seeds Android's base (unqualified) values/strings.xml with the
    // primary locale's native strings. Without this, Android Lint's
    // ExtraTranslation check treats every string in locales.en /
    // locales["pt-BR"] as an orphaned translation (present in a
    // locale-tagged resource file, absent from the default one) and
    // FAILS gradlew bundleRelease -- this is what killed the 2026-07-05
    // overnight EAS cloud build. See withDefaultLocaleStrings.js.
    ["./plugins/withDefaultLocaleStrings", { stringsByKey: defaultLocaleNativeStrings }],
  ],
  androidStatusBar: {
    barStyle: "dark-content",
    backgroundColor: "#ffffff",
  },
  android: {
    playStoreUrl: "https://play.google.com/store/apps/details?id=app.pegada",
    permissions: ["com.google.android.gms.permission.AD_ID"],
    splash: {
      mdpi: "./src/assets/images/splash-android.png",
      hdpi: "./src/assets/images/splash-android@1.5x.png",
      xhdpi: "./src/assets/images/splash-android@2x.png",
      xxhdpi: "./src/assets/images/splash-android@3x.png",
      xxxhdpi: "./src/assets/images/splash-android@4x.png",
      backgroundColor: "#FFFFFF",
      dark: {
        mdpi: "./src/assets/images/splash-android.png",
        hdpi: "./src/assets/images/splash-android@1.5x.png",
        xhdpi: "./src/assets/images/splash-android@2x.png",
        xxhdpi: "./src/assets/images/splash-android@3x.png",
        xxxhdpi: "./src/assets/images/splash-android@4x.png",
        backgroundColor: "#000000",
      },
    },
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./src/assets/images/adaptive-icon.png",
      // Android 13+ "Themed icons" setting recolors this to the user's
      // wallpaper-derived palette, so it must be a single-color (white)
      // silhouette on transparency, not the full-color glyph.
      monochromeImage: "./src/assets/images/adaptive-icon-monochrome.png",
      backgroundColor: "#FFFFFF",
    },
    package: "app.pegada",
    // intentFilters: [
    //   {
    //     action: 'VIEW',
    //     autoVerify: true,
    //     data: [
    //       {
    //         scheme: 'https',
    //         host: '*.pegada.app',
    //         pathPrefix: '/',
    //       },
    //     ],
    //     category: ['BROWSABLE', 'DEFAULT'],
    //   },
    // ],
  },
  userInterfaceStyle: "automatic",
  locales: {
    en: require(`@pegada/shared/i18n/locales/en/native.json`),
    "pt-BR": require(`@pegada/shared/i18n/locales/pt-BR/native.json`),
  },
  ios: {
    appStoreUrl: "https://apps.apple.com/app/id6450865592",
    infoPlist: {
      CFBundleAllowMixedLocalizations: true,
    },
    splash: {
      backgroundColor: "#FFFFFF",
      image: "./src/assets/images/splash-ios.png",
      dark: {
        image: "./src/assets/images/splash-ios.png",
        backgroundColor: "#000000",
      },
    },
    googleServicesFile: "./GoogleService-Info.plist",
    // iOS 18+ dark/tinted home screen icon variants. `light` falls back to
    // the top-level `icon` when omitted. Both variants must be the glyph
    // on a transparent background -- iOS supplies the dark backdrop and
    // applies the user's tint color itself.
    icon: {
      dark: "./src/assets/images/icon-dark.png",
      tinted: "./src/assets/images/icon-tinted.png",
    },
    config: {
      usesNonExemptEncryption: false,
    },
    bundleIdentifier: "app.pegada",
    // associatedDomains: [
    //   'applinks:pegada.app',
    //   'applinks:www.pegada.app',
    // ],
  },
  extra: {
    oneSignalAppId: "",
    eas: {
      projectId: "cadfd124-f01c-4d16-910e-1455f62a3b03",
    },
  },
};

export default config;
