// @ts-nocheck
/**
 * The edits behind `with-initial-theme-override.js`, kept separate from the
 * plugin wrapper so they can be tested: requiring `expo/config-plugins`
 * pulls in `expo/virtual/env.js`, which is ESM that this project's jest does
 * not transform, so anything that imports the plugin cannot be loaded in a
 * test at all (see cleartext-traffic.js for the same split).
 */
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");

const IOS_OVERRIDE_SNIPPET = `    if let themeOverride = UserDefaults.standard.string(forKey: "pegadaThemeOverride"),
      themeOverride == "dark" || themeOverride == "light" {
      window?.overrideUserInterfaceStyle = themeOverride == "dark" ? .dark : .light
    }`;

// Must match modules/pegada-theme-override's PegadaThemeOverrideModule.kt
// (PREFS_NAME/KEY constants) exactly — that's the writer, this is the reader.
const ANDROID_IMPORTS_SNIPPET = `import android.content.Context
import androidx.appcompat.app.AppCompatDelegate`;

const ANDROID_NIGHT_MODE_SNIPPET = `    val pegadaThemeOverride = getSharedPreferences("pegada_theme_override", Context.MODE_PRIVATE)
      .getString("pegadaThemeOverride", null)
    AppCompatDelegate.setDefaultNightMode(
      when (pegadaThemeOverride) {
        "dark" -> AppCompatDelegate.MODE_NIGHT_YES
        "light" -> AppCompatDelegate.MODE_NIGHT_NO
        else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
      },
    )`;

/** Applies the iOS AppDelegate.swift edit, given its current contents. */
const applyIOSThemeOverride = ({ language, contents }) => {
  if (language !== "swift") {
    throw new Error(
      `withInitialThemeOverride: expected a Swift AppDelegate, found ${language}`,
    );
  }

  return mergeContents({
    tag: "initial-theme-override",
    src: contents,
    newSrc: IOS_OVERRIDE_SNIPPET,
    anchor: /window = UIWindow\(frame: UIScreen\.main\.bounds\)/,
    offset: 1,
    comment: "//",
  }).contents;
};

/** Applies the Android MainApplication.kt edit, given its current contents. */
const applyAndroidThemeOverride = ({ language, contents }) => {
  if (language !== "kt") {
    throw new Error(
      `withInitialThemeOverride: expected a Kotlin MainApplication, found ${language}`,
    );
  }

  const withImports = mergeContents({
    tag: "initial-theme-override-imports",
    src: contents,
    newSrc: ANDROID_IMPORTS_SNIPPET,
    anchor: /^package .+/,
    offset: 1,
    comment: "//",
  }).contents;

  return mergeContents({
    tag: "initial-theme-override",
    src: withImports,
    newSrc: ANDROID_NIGHT_MODE_SNIPPET,
    anchor: /super\.onCreate\(\)/,
    offset: 1,
    comment: "//",
  }).contents;
};

module.exports = { applyIOSThemeOverride, applyAndroidThemeOverride };
