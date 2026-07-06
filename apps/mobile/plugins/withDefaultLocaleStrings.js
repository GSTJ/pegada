// @ts-nocheck
/**
 * Expo config plugin: copies the app's primary locale's native strings
 * (from app.config.ts's `locales` map) into Android's base, unqualified
 * `values/strings.xml`.
 *
 * Why this is needed:
 *   `locales: { en: ..., "pt-BR": ... }` in app.config.ts only generates
 *   locale-TAGGED Android resource dirs (`values-b+en/`, `values-b+pt+BR/`),
 *   see https://docs.expo.dev/guides/localization/#translating-app-metadata.
 *   It never populates the base `values/strings.xml` (no locale
 *   qualifier), which Android treats as the app's default/fallback
 *   resource set.
 *
 *   Android Lint's "ExtraTranslation" check flags any string that exists
 *   in a locale-qualified resource file but NOT in the default one, on
 *   the assumption it's an orphaned/unused translation. Since our
 *   permission strings (NSUserTrackingUsageDescription, etc.) exist in
 *   values-b+en/ and values-b+pt+BR/ but never in values/, this is a
 *   FATAL lint error on `gradlew bundleRelease` (verified: killed the
 *   2026-07-05 overnight EAS cloud build, `lintVitalRelease` failure,
 *   first failure reported as NSUserTrackingUsageDescription).
 *
 *   This plugin copies the primary locale (English, the language the
 *   rest of the app's un-translated native strings/app_name already
 *   default to) into values/strings.xml, giving lint a default-locale
 *   baseline so these keys stop looking like orphaned translations.
 *
 * This is a real fix, not a suppression: the strings genuinely belong in
 * the default resource set (that's what "default" means to Android/lint),
 * Expo's locales config just doesn't populate it for us.
 */
const { withStringsXml, AndroidConfig } = require("expo/config-plugins");

const withDefaultLocaleStrings = (config, { stringsByKey }) => {
  return withStringsXml(config, (modConfig) => {
    let strings = modConfig.modResults;
    for (const [name, value] of Object.entries(stringsByKey)) {
      strings = AndroidConfig.Strings.setStringItem(
        [{ $: { name }, _: value }],
        strings,
      );
    }
    modConfig.modResults = strings;
    return modConfig;
  });
};

module.exports = withDefaultLocaleStrings;
