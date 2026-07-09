// https://github.com/expo/router/blob/main/apps/demo/metro.config.js
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { getPostHogExpoConfig } = require("posthog-react-native/metro");
const path = require("path");

// Find the project and workspace directories
const projectRoot = __dirname;

const workspaceRoot = path.resolve(projectRoot, "../..");

// Wraps the default config so every JS bundle (Release native builds AND
// `expo export`/`eas update` OTA bundles) gets a chunk/debug id injected at
// build time. That id is what lets PostHog match an uploaded sourcemap back
// to the exact bundle a crash came from. Safe to always apply: it only
// annotates the bundle, it never uploads anything itself (upload happens
// separately, see app.config.ts's posthog-react-native/expo plugin and
// scripts/upload-posthog-sourcemaps-ota.sh for the OTA path).
const config = getPostHogExpoConfig(__dirname, { getDefaultConfig });

config.watcher = {
  // +73.3
  ...config.watcher,
  healthCheck: {
    enabled: true,
  },
};

// SVG Support
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts.push("svg");

// dotLottie Support
config.resolver.assetExts.push("lottie");

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// 4. Never let native bundles resolve the WEB build of styled-components.
// A transitive import of bare "styled-components" pulls the DOM StyleSheet
// (document.head/createElement) into the iOS bundle; depending on install
// layout it can end up EXECUTED and the app dies at route load with
// "ReferenceError: Property 'document' doesn't exist" (seen on CI run
// 28596688266 while local builds happened to resolve the native build).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName === "styled-components") {
    moduleName = "styled-components/native";
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

const { FileStore } = require("metro-cache");
config.cacheStores = [
  // Ensure the cache isn't shared between projects
  // this ensures the transform-time environment variables are changed to reflect
  // the current project.
  new FileStore({ root: path.join(projectRoot, "node_modules/.cache/metro") }),
];

module.exports = config;
