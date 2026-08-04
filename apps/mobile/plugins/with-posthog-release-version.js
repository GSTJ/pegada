// @ts-nocheck
/**
 * Make PostHog read the iOS release version from the Info.plist that EAS
 * updates before archiving. Expo's Xcode template leaves MARKETING_VERSION
 * and CURRENT_PROJECT_VERSION at 1.0/1, which otherwise sends sourcemaps to
 * the wrong PostHog release.
 */
const { withXcodeProject } = require("expo/config-plugins");

const RELEASE_VERSION_SNIPPET = `# posthog-release-version
POSTHOG_INFO_PLIST="\${PROJECT_DIR}/\${INFOPLIST_FILE}"
if [ -f "$POSTHOG_INFO_PLIST" ]; then
  export MARKETING_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$POSTHOG_INFO_PLIST")"
  export CURRENT_PROJECT_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$POSTHOG_INFO_PLIST")"
fi`;

const withPostHogReleaseVersion = (config) => {
  return withXcodeProject(config, (modConfig) => {
    const bundlePhase = modConfig.modResults.pbxItemByComment(
      "Bundle React Native code and images",
      "PBXShellScriptBuildPhase",
    );

    if (!bundlePhase) {
      throw new Error(
        "withPostHogReleaseVersion: could not find the React Native bundle phase",
      );
    }

    const script = JSON.parse(bundlePhase.shellScript);
    if (script.includes("# posthog-release-version")) {
      return modConfig;
    }

    const posthogCommand = /^.*posthog-xcode\.sh.*$/m;
    if (!posthogCommand.test(script)) {
      throw new Error(
        "withPostHogReleaseVersion: PostHog did not add its Xcode bundle command",
      );
    }

    bundlePhase.shellScript = JSON.stringify(
      script.replace(posthogCommand, `${RELEASE_VERSION_SNIPPET}\n\n$&`),
    );

    return modConfig;
  });
};

module.exports = withPostHogReleaseVersion;
