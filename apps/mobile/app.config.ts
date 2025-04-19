import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  /**
   * Always update the version when making a native change
   * That affects eas updates and makes sure the app doesn't
   * break when updating Over The Air
   */
  version: "1.3.1",
  runtimeVersion: {
    policy: "appVersion"
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
    fallbackToCacheTimeout: 10000
  },

  experiments: {
    reactCompiler: true,
    typedRoutes: true,
    tsconfigPaths: true
  },
  plugins: [
    "expo-secure-store",
    "expo-notifications",
    "expo-localization",
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          // https://docs.page/invertase/react-native-google-mobile-ads#optionally-configure-ios-static-frameworks
          useFrameworks: "static"
        },
        android: {
          // https://docs.page/invertase/react-native-google-mobile-ads/european-user-consent#handling-consent
          extraProguardRules:
            "-keep class com.google.android.gms.internal.consent_sdk.** { *; }"
        }
      }
    ],
    [
      "expo-tracking-transparency",
      {
        userTrackingPermission:
          "The app tracks anonymous data to improve user experience, we respect your privacy."
      }
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
          "./../../packages/shared/themes/fonts/Gilroy-SemiBold.ttf"
        ]
      }
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
          "3qcr597p9d.skadnetwork"
        ]
      }
    ],
    [
      "expo-updates",
      {
        username: "gstj"
      }
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "The app uses your location to find doggies near you."
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "The app allows you to choose photos for your doggie's profile.",
        cameraPermission:
          "The app allows you to take photos for your doggie's profile."
      }
    ],
    "@bugsnag/plugin-expo-eas-sourcemaps"
  ],
  androidStatusBar: {
    barStyle: "dark-content",
    backgroundColor: "#ffffff"
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
        backgroundColor: "#000000"
      }
    },
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./src/assets/images/adaptive-icon.png",
      backgroundColor: "#FFFFFF"
    },
    package: "app.pegada",
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY
      }
    }
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
    "pt-BR": require(`@pegada/shared/i18n/locales/pt-BR/native.json`)
  },
  ios: {
    appStoreUrl: "https://apps.apple.com/app/id6450865592",
    infoPlist: {
      CFBundleAllowMixedLocalizations: true
    },
    splash: {
      backgroundColor: "#FFFFFF",
      image: "./src/assets/images/splash-ios.png",
      dark: {
        image: "./src/assets/images/splash-ios.png",
        backgroundColor: "#000000"
      }
    },
    googleServicesFile: "./GoogleService-Info.plist",
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY,
      usesNonExemptEncryption: false
    },
    bundleIdentifier: "app.pegada"
    // associatedDomains: [
    //   'applinks:pegada.app',
    //   'applinks:www.pegada.app',
    // ],
  },
  packagerOpts: {
    config: "metro.config.js",
    sourceExts: ["ts", "tsx", "js", "jsx", "json", "wasm", "svg"]
  },
  extra: {
    oneSignalAppId: "",
    bugsnag: {
      apiKey: process.env.EXPO_PUBLIC_BUGSNAG_API_KEY
    },
    eas: {
      projectId: "cadfd124-f01c-4d16-910e-1455f62a3b03"
    }
  }
};

export default config;
