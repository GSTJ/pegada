// @ts-nocheck
/**
 * Expo config plugin: attaches a StoreKit configuration file to the iOS
 * project so simulator builds can resolve real product pricing for the
 * upgrade wall.
 *
 * Why a config plugin?
 *   The mobile app uses Expo's managed workflow — the `ios/` directory is
 *   generated on every `expo prebuild`. We can't manually edit the .xcodeproj
 *   after generation; the changes would be wiped on the next build. This
 *   plugin runs during the prebuild step and:
 *     1. Copies the source `.storekit` file into the generated Xcode project
 *        as a resource file (so Xcode tracks it for archive).
 *     2. Wires it into the primary scheme's "Run" action via the
 *        `StoreKitConfigurationFileReference` element, which is what tells
 *        the simulator's StoreKit framework to use a local fixture instead
 *        of trying to talk to the App Store sandbox.
 *
 * Why ship this file at all?
 *   Without a StoreKit configuration in the active scheme, `StoreKit.products`
 *   resolves to an empty array on the iOS simulator (App Store is unreachable).
 *   That cascades into `Purchases.getOfferings()` returning `current: null`,
 *   which renders the upgrade wall with empty plan rows and a CTA stuck in
 *   loading. The Maestro `25-upgrade-journey` validator caught exactly that.
 *
 * The product IDs (`premium_monthly`, `premium_yearly`) are NOT secrets —
 * they're declared in App Store Connect and visible in the App Store listing.
 * Checking the .storekit file into source control is the documented Apple
 * pattern: https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode
 */
const { withXcodeProject, IOSConfig } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const STOREKIT_FILE_NAME = "Pegada.storekit";

const withStoreKitConfiguration = (config) => {
  return withXcodeProject(config, async (modConfig) => {
    const projectRoot = modConfig.modRequest.projectRoot;
    const platformRoot = modConfig.modRequest.platformProjectRoot;
    const sourcePath = path.join(projectRoot, STOREKIT_FILE_NAME);

    if (!fs.existsSync(sourcePath)) {
      // No .storekit file in the mobile app root — silently skip. This
      // keeps the plugin safe for environments that don't have the file
      // (e.g. fresh clones before the file has been pulled).
      // eslint-disable-next-line no-console
      console.warn(
        `[withStoreKitConfiguration] ${STOREKIT_FILE_NAME} not found at ${sourcePath} — skipping StoreKit wiring.`,
      );
      return modConfig;
    }

    // Copy the .storekit file into the generated Xcode project root so the
    // path embedded in the scheme is stable across machines.
    const destPath = path.join(platformRoot, STOREKIT_FILE_NAME);
    fs.copyFileSync(sourcePath, destPath);

    // Add the file to the Xcode project as a resource so it's tracked by
    // the project (visible in the Project Navigator, included in the
    // Resources build phase). IOSConfig.XcodeUtils handles the PBX file
    // reference + build-phase membership in one call.
    const xcodeProject = modConfig.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);

    try {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: STOREKIT_FILE_NAME,
        groupName: projectName,
        project: xcodeProject,
        isBuildFile: true,
        verbose: false,
      });
    } catch (error) {
      // Idempotent: if the file was already added on a previous prebuild,
      // adding it again throws. That's safe to swallow.
      if (!/already exists/i.test(String(error?.message ?? ""))) {
        throw error;
      }
    }

    // The scheme XML lives outside the .xcodeproj — patch it directly so
    // simulator runs pick up the StoreKit fixture. Without this step the
    // file is bundled into the app but never activated by StoreKit.
    const schemePath = path.join(
      platformRoot,
      `${projectName}.xcodeproj`,
      "xcshareddata",
      "xcschemes",
      `${projectName}.xcscheme`,
    );

    if (fs.existsSync(schemePath)) {
      let schemeContent = fs.readFileSync(schemePath, "utf8");

      // Only inject if not already present — keeps the plugin idempotent
      // across repeated prebuilds.
      if (!schemeContent.includes("StoreKitConfigurationFileReference")) {
        const storeKitRef = `         <StoreKitConfigurationFileReference\n            identifier = "../../${STOREKIT_FILE_NAME}">\n         </StoreKitConfigurationFileReference>\n      `;

        // Inject just before the closing </LaunchAction> tag — that's the
        // scheme section that controls simulator/device runs.
        schemeContent = schemeContent.replace(
          /(\s*)<\/LaunchAction>/,
          `\n         ${storeKitRef}$1</LaunchAction>`,
        );

        fs.writeFileSync(schemePath, schemeContent, "utf8");
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `[withStoreKitConfiguration] scheme file not found at ${schemePath} — StoreKit file copied but not activated.`,
      );
    }

    return modConfig;
  });
};

module.exports = withStoreKitConfiguration;
