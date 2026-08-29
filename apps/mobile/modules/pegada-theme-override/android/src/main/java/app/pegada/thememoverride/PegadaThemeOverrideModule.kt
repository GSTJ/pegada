package app.pegada.thememoverride

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * React Native's `Settings` API (the one iOS mirrors the theme override into
 * via NSUserDefaults) has no Android implementation -- it's a no-op stub on
 * that platform. This module is the Android equivalent: it writes the
 * override into SharedPreferences so MainApplication.onCreate can read it
 * and call AppCompatDelegate.setDefaultNightMode BEFORE the splash screen
 * shows (see plugins/with-initial-theme-override.js). PREFS_NAME/KEY must
 * match that plugin's injected Kotlin exactly.
 */
class PegadaThemeOverrideModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("PegadaThemeOverride")

    Function("set") { value: String ->
      context
        .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY, value)
        .apply()
    }
  }

  companion object {
    const val PREFS_NAME = "pegada_theme_override"
    const val KEY = "pegadaThemeOverride"
  }
}
