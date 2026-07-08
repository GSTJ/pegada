// @ts-nocheck
/**
 * Expo config plugin: compiles App Intents (Siri / Shortcuts / Spotlight)
 * into the MAIN iOS app target.
 *
 * Why a config plugin?
 *   Same CNG constraint as withStoreKitConfiguration: ios/ is regenerated on
 *   every `expo prebuild`, so the Swift source must be (re)wired into the
 *   Xcode project at prebuild time. App Intents specifically must live in the
 *   app bundle (not a pod, not the widget extension) for the
 *   AppShortcutsProvider phrases to register with Siri and Spotlight.
 *
 * What it does:
 *   1. Copies plugins/appIntents/PegadaAppIntents.swift into the generated
 *      project and adds it to the main target's Sources build phase.
 *   2. Generates <lang>.lproj/AppShortcuts.strings (the fixed table name the
 *      system uses to localize Siri phrases) from appShortcutsPhrases.json,
 *      next to the InfoPlist.strings files Expo's `locales` support already
 *      creates under <project>/Supporting/.
 *
 * Intent titles/descriptions are NOT handled here -- those ride the app's
 * existing native strings mechanism: `ios["Localizable.strings"]` entries in
 * packages/shared/i18n/locales/<lang>/native.json, which Expo turns into
 * <lang>.lproj/Localizable.strings natively (see @expo/config-plugins
 * ios/Locales.js).
 */
const { withXcodeProject, IOSConfig } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const SWIFT_FILE_NAME = "PegadaAppIntents.swift";
const PHRASES_FILE_NAME = "appShortcutsPhrases.json";
const STRINGS_FILE_NAME = "AppShortcuts.strings";
const SOURCE_DIR = path.join(__dirname, "appIntents");

const escapeStringsValue = (value) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const withAppIntents = (config) => {
  return withXcodeProject(config, (modConfig) => {
    const projectRoot = modConfig.modRequest.projectRoot;
    const platformRoot = modConfig.modRequest.platformProjectRoot;
    const project = modConfig.modResults;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);

    // 1. Swift source -> main target Sources build phase. Copied to the
    // project root and referenced by basename, exactly like the (proven)
    // withStoreKitConfiguration resource wiring.
    fs.copyFileSync(path.join(SOURCE_DIR, SWIFT_FILE_NAME), path.join(platformRoot, SWIFT_FILE_NAME));

    try {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: SWIFT_FILE_NAME,
        groupName: projectName,
        project,
        verbose: false,
      });
    } catch (error) {
      // Idempotent across repeated prebuilds without a clean.
      if (!/already exists/i.test(String(error?.message ?? ""))) {
        throw error;
      }
    }

    // 2. Siri phrase localizations -> Supporting/<lang>.lproj/AppShortcuts.strings.
    // Mirrors how @expo/config-plugins writes InfoPlist.strings/Localizable.strings
    // so the files sit in the same lproj folders and Xcode picks the right
    // locale at runtime.
    const phrasesByLocale = JSON.parse(
      fs.readFileSync(path.join(SOURCE_DIR, PHRASES_FILE_NAME), "utf8"),
    );
    const supportingDirectory = path.join(platformRoot, projectName, "Supporting");

    for (const [lang, phrases] of Object.entries(phrasesByLocale)) {
      if (lang === "//") continue; // JSON "comment" key.

      const lprojDir = path.join(supportingDirectory, `${lang}.lproj`);
      fs.mkdirSync(lprojDir, { recursive: true });

      const lines = Object.entries(phrases).map(
        ([key, value]) => `"${escapeStringsValue(key)}" = "${escapeStringsValue(value)}";`,
      );
      fs.writeFileSync(path.join(lprojDir, STRINGS_FILE_NAME), `${lines.join("\n")}\n`);

      const groupName = `${projectName}/Supporting/${lang}.lproj`;
      const group = IOSConfig.XcodeUtils.ensureGroupRecursively(project, groupName);
      const alreadyAdded = group?.children?.some(({ comment }) => comment === STRINGS_FILE_NAME);

      if (!alreadyAdded) {
        IOSConfig.XcodeUtils.addResourceFileToGroup({
          filepath: `${lang}.lproj/${STRINGS_FILE_NAME}`,
          groupName,
          project,
          isBuildFile: true,
          verbose: false,
        });
      }
    }

    return modConfig;
  });
};

module.exports = withAppIntents;
